import { MuSchema } from 'muschema/schema';
import MuUnion = require('muschema/union');
import { MuSocket } from 'munet/net';
import { MuStateSet, pushState, mostRecentCommonState, garbageCollectStates } from './state-set';

function compareInt (a, b) { return a - b; }

export type FreeModel = MuSchema<any>;

export type MessageType = FreeModel;
export type MessageTableBase = { [message:string]:MessageType };
export interface MessageInterface<MessageTable extends MessageTableBase> {
    api:{ [message in keyof MessageTable]:(event:MessageTable[message]['identity']) => void; };
    schema:MuSchema<{
        type:keyof MessageTable;
        data:MessageTable[keyof MessageTable]['identity'];
    }>;
}

export type RPCType = { 0:FreeModel, 1:FreeModel } | [FreeModel, FreeModel];
export type RPCTableBase = { [event:string]:RPCType };
export interface RPCInterface<RPCTable extends RPCTableBase> {
    api:{
        [rpc in keyof RPCTable]:(
            args:RPCTable[rpc]['0']['identity'],
            cb?:(err?:any, result?:RPCTable[rpc]['1']['identity']) => void) => void; };
    args:MuSchema<{
        type:keyof RPCTable;
        data:RPCTable[keyof RPCTable]['0']['identity'];
    }>;
    response:MuSchema<{
        type:keyof RPCTable,
        data:RPCTable[keyof RPCTable]['1']['identity'];
    }>;
}

export interface MuStateReplica<StateSchema extends FreeModel> {
    past:MuStateSet<StateSchema['identity']>;
    state:StateSchema['identity'];
    tick:number;
    schema:StateSchema;
    windowLength:number;
}

export enum MuPacketType {
    RPC,
    RPC_RESPONSE,
    MESSAGE,
    STATE,
    ACK_STATE,
    DROP_STATE,
    // PING?
    // TICK?
}

export class MuRPCReply {
    public method:string;
    public handler:(err?:any, data?:any) => void;

    constructor (method:string, handler:(err?:any, data?:any) => void) {
        this.method = method;
        this.handler = handler;
    }
}

export class MuRPCReplies {
    public pendingRPC:{ [id:number]:MuRPCReply; } = {};
    public rpcCounter:number = 1;

    public addRPC (method:string, handler:(err?:any, data?:any) => void) {
        const id = ++this.rpcCounter;
        this.pendingRPC[id] = new MuRPCReply(method, handler);
        return id;
    }

    public cancel () {
        Object.keys(this.pendingRPC).forEach((id) => {
            (this.pendingRPC[id])('rpc cancelled');
        });
        this.pendingRPC = {};
    }
}

export class MuProtocol<
    StateSchema extends FreeModel,
    MessageTable extends MessageTableBase,
    RPCTable extends RPCTableBase> {
    public readonly stateSchema:StateSchema;

    public readonly messageTable:MessageTable;
    public readonly messageSchema:MessageInterface<MessageTable>['schema'];

    public readonly rpcTable:RPCTable;
    public readonly rpcArgsSchema:RPCInterface<RPCTable>['args'];
    public readonly rpcResponseSchema:RPCInterface<RPCTable>['response'];

    constructor (stateSchema:StateSchema, messageTable:MessageTable, rpcTable:RPCTable) {
        this.stateSchema = stateSchema;

        this.messageTable = messageTable;
        this.messageSchema = MuUnion(messageTable);

        type RPCSchemaArgs = { [key:string]:MuSchema<any> };

        this.rpcTable = rpcTable;
        const rpcArgs = <RPCSchemaArgs>{};
        const rpcResponse = <RPCSchemaArgs>{};
        Object.keys(rpcTable).forEach((method) => {
            rpcArgs[method] = rpcTable[method][0];
            rpcResponse[method] = rpcTable[method][1];
        });

        this.rpcArgsSchema = MuUnion(rpcArgs);
        this.rpcResponseSchema = MuUnion(rpcResponse);
    }

    public createParser ({
        socket,
        replica,
        messageHandlers,
        rpcHandlers,
        rpcReplies,
        observations,
        stateHandler }:{
        socket:MuSocket,
        replica:MuStateReplica<StateSchema>,
        observations:number[],
        messageHandlers:MessageInterface<MessageTable>['api'],
        rpcHandlers:RPCInterface<RPCTable>['api'],
        rpcReplies:MuRPCReplies,
        stateHandler:() => void,
    }) : (packet:any) => void {
        let mostRecentAck = 0;

        const messageSchema = this.messageSchema;
        function handleMessage (data:any) {
            const message = messageSchema.patch(messageSchema.identity, data);
            const handler = messageHandlers[message.type];
            return handler(message.data);
        }

        const rpcArgSchema = this.rpcArgsSchema;
        const rpcResponseSchema = this.rpcResponseSchema;
        const rpcResponsePacket = rpcResponseSchema.alloc();
        const rpcContainerPacket = {
            type: MuPacketType.RPC_RESPONSE,
            id: 0,
            err: null,
            data: null,
        };

        function rpcNoop (err?:any, result?:any) {
            if (result) {
                rpcResponsePacket.data = result;
                rpcResponseSchema.free(rpcResponsePacket);
            }
        }

        function handleRPC (data:any, callbackId:number) {
            const args = rpcArgSchema.patch(rpcArgSchema.identity, data);
            const handler = rpcHandlers[args.type];

            if (!callbackId) {
                return handler(args.data, rpcNoop);
            }

            return handler(args.data, function rpcReply (err?:any, result?:any) {
                rpcResponsePacket.type = args.type;
                rpcContainerPacket.id = callbackId;
                rpcContainerPacket.err = err;
                if (result) {
                    rpcResponsePacket.data = result;
                    const schema = rpcResponseSchema.muData[args.type];
                    rpcContainerPacket.data = schema.diff(schema.identity, rpcResponsePacket);
                    rpcResponseSchema.free(rpcResponsePacket);
                } else {
                    rpcContainerPacket.data = null;
                }
                socket.send(JSON.stringify(rpcContainerPacket));
            });
        }

        function handleRPCResponse (data:any, callbackId:number) {
            const handler = rpcReplies.pendingRPC[callbackId];
            if (handler) {
                delete rpcReplies.pendingRPC[callbackId];
                const schema = rpcResponseSchema.muData[handler.method];
                if (schema) {
                    const response = schema.patch(schema.identity, data);
                    handler.handler(response);
                }
            }
        }

        const stateSchema = this.stateSchema;
        const ackStatePacket = {
            type: MuPacketType.ACK_STATE,
            tick: 0,
        };

        function handleState (baseTick:number, patch:any, nextTick:number) {
            const stateSet = replica.past;
            const baseIndex = stateSet.at(baseTick);
            if (baseIndex >= 0 && stateSet.ticks[baseIndex] === baseTick) {
                const baseState = stateSet.states[baseIndex];
                const nextState = patch
                    ? stateSchema.patch(baseState, patch)
                    : stateSchema.clone(baseState);
                pushState(stateSet, nextTick, nextState);
                ackStatePacket.tick = nextTick;
                socket.sendUnreliable(JSON.stringify(ackStatePacket));

                // purge old acknowldged states
                mostRecentAck = Math.max(mostRecentAck, baseTick);
                const gcCutoff = Math.min(mostRecentAck, Math.max(nextTick, replica.tick) - replica.windowLength);
                garbageCollectStates(stateSchema, stateSet, gcCutoff);

                if (nextTick > replica.tick) {
                    replica.tick = nextTick;
                    replica.state = nextState;
                    stateHandler();
                }
            }
        }

        function handleAckState (tick:number) {
            observations.push(tick);
            let ptr = observations.length - 1;
            while (ptr > 1) {
                if (observations[ptr - 1] > tick) {
                    observations[ptr] = observations[ptr - 1];
                    ptr -= 1;
                } else {
                    break;
                }
            }
            if (observations[ptr] < tick) {
                observations[ptr] = tick;
            }
        }

        function handleDropState (tick:number) {
            let ptr = 1;
            for (; ptr < observations.length; ++ptr) {
                if (observations[ptr] > tick) {
                    break;
                }
            }

            let sptr = 1;
            for (; ptr < observations.length; ++ptr, ++sptr) {
                observations[sptr] = observations[ptr];
            }
            observations.length = sptr;
        }

        function onPacket (data:any) {
            const packet = JSON.parse(data);
            switch (packet.type) {
                case MuPacketType.MESSAGE:
                    return handleMessage(packet.data);
                case MuPacketType.RPC:
                    return handleRPC(packet.data, packet.id);
                case MuPacketType.RPC_RESPONSE:
                    return handleRPCResponse(packet.data, packet.id);
                case MuPacketType.STATE:
                    return handleState(packet.baseTick, packet.data, packet.nextTick);
                case MuPacketType.ACK_STATE:
                    return handleAckState(packet.tick);
                case MuPacketType.DROP_STATE:
                    return handleDropState(packet.tick);
            }
        }

        return onPacket;
    }

    public createMessageDispatch (sockets:MuSocket[]) : MessageInterface<MessageTable>['api'] {
        const result = <MessageInterface<MessageTable>['api']>{};
        const schema = this.messageSchema;
        Object.keys(this.messageTable).forEach((message) => {
            const packet = schema.alloc();
            packet.type = message;
            result[message] = (data:any) => {
                packet.data = data;
                const serialized = schema.diff(schema.identity, packet);
                packet.data = null;
                const rawData = JSON.stringify({
                    type: MuPacketType.MESSAGE,
                    data: serialized,
                });
                for (let i = 0; i < sockets.length; ++i) {
                    sockets[i].send(rawData);
                }
            };
        });
        return result;
    }

    public createPRCCallDispatch (socket:MuSocket, rpcReplies:MuRPCReplies) : RPCInterface<RPCTable>['api']  {
        const result = <RPCInterface<RPCTable>['api']>{};
        const argSchema = this.rpcArgsSchema;
        Object.keys(this.rpcTable).forEach((method) => {
            const packet = argSchema.alloc();
            packet.type = method;
            result[method] = (arg:any, cb?:(err?:any, result?:any) => any) => {
                packet.data = arg;
                const serialized = argSchema.diff(argSchema.identity, packet);
                packet.data = null;
                if (cb) {
                    const rpcId = rpcReplies.addRPC(method, cb);
                    socket.send(JSON.stringify({
                        type: MuPacketType.RPC,
                        id: rpcId,
                        data: serialized,
                    }));
                } else {
                    socket.send(JSON.stringify({
                        type: MuPacketType.RPC,
                        data: serialized,
                    }));
                }
            };
        });
        return result;
    }

    public dispatchState (localStates:MuStateSet<StateSchema>, observations:number[][], sockets:MuSocket[], bufferSize:number) {
        observations.push(localStates.ticks);
        const baseTick = mostRecentCommonState(observations);
        observations.pop();

        const baseIndex = localStates.at(baseTick);
        const baseState = localStates.states[baseIndex];

        const nextTick = localStates.ticks[localStates.ticks.length - 1];
        const nextState = localStates.states[localStates.states.length - 1];

        const data = JSON.stringify({
            type: MuPacketType.STATE,
            baseTick,
            nextTick,
            data: this.stateSchema.diff(baseState, nextState),
        });

        for (let i = 0; i < sockets.length; ++i) {
            sockets[i].sendUnreliable(data);
        }

        // garbage collect old states
        const gcCutoff = Math.min(baseTick, nextTick - bufferSize);
        garbageCollectStates(this.stateSchema, localStates, gcCutoff);
        for (let i = 0; i < observations.length; ++i) {
            const list = observations[i];
            let ptr = 1;
            for (let j = 1; j < list.length; ++j) {
                if (list[j] >= gcCutoff) {
                    list[ptr++] = list[j];
                }
            }
            list.length = ptr;
        }
    }
}
