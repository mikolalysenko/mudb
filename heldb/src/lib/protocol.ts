import HelModel from 'helschema/model';
import HelUnion = require('helschema/union');
import { HelSocket } from 'helnet/net';
import { HelStateSet, pushState, mostRecentCommonState, garbageCollectStates } from './state-set';

function compareInt (a, b) { return a - b; }

export type FreeModel = HelModel<any>;

export type MessageType = FreeModel;
export type MessageTableBase = { [message:string]:MessageType };
export interface MessageInterface<MessageTable extends MessageTableBase> {
    api:{ [message in keyof MessageTable]:(event:MessageTable[message]['identity']) => void; };
    schema:HelModel<{
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
    args:HelModel<{
        type:keyof RPCTable;
        data:RPCTable[keyof RPCTable]['0']['identity'];
    }>;
    response:HelModel<{
        type:keyof RPCTable,
        data:RPCTable[keyof RPCTable]['1']['identity'];
    }>;
}

export interface HelStateReplica<StateSchema extends FreeModel> {
    past:HelStateSet<StateSchema['identity']>;
    state:StateSchema['identity'];
    tick:number;
    schema:StateSchema;
    windowLength:number;
}

export enum HelPacketType {
    RPC,
    RPC_RESPONSE,
    MESSAGE,
    STATE,
    ACK_STATE,
    DROP_STATE,

    // PING?
    // TICK?
}

export class HelRPCReply {
    public method:string;
    public handler:(data:any) => void;

    constructor (method:string, handler:(data:any) => void) {
        this.method = method;
        this.handler = handler;
    }
}

export class HelRPCReplies {
    public pendingRPC:{ [id:number]:HelRPCReply; } = {};
    public rpcConter:number = 1;

    public cancel () {
    }
}

export class HelProtocol<
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
        this.messageSchema = HelUnion(messageTable);

        type RPCArgs = {
            [method in keyof RPCTable]:RPCTable[method]['0'];
        };
        type RPCResponse = {
            [method in keyof RPCTable]:RPCTable[method]['1'];
        };

        this.rpcTable = rpcTable;
        const rpcArgs = {};
        const rpcResponse = {};
        Object.keys(rpcTable).forEach((method) => {
            rpcArgs[method] = rpcTable[method][0];
            rpcResponse[method] = rpcTable[method][1];
        });

        this.rpcArgsSchema = HelUnion(<RPCArgs>rpcArgs);
        this.rpcResponseSchema = HelUnion(<RPCResponse>rpcResponse);
    }

    public createParser ({
        socket,
        replica,
        messageHandlers,
        rpcHandlers,
        rpcReplies,
        observations,
        stateHandler }:{
        socket:HelSocket,
        replica:HelStateReplica<StateSchema>,
        observations:number[],
        messageHandlers:MessageInterface<MessageTable>['api'],
        rpcHandlers:RPCInterface<RPCTable>['api'],
        rpcReplies:HelRPCReplies,
        stateHandler:(state:StateSchema['identity'], tick:number) => void,
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
            type: HelPacketType.RPC_RESPONSE,
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
                    const schema = rpcResponseSchema.helData[args.type];
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
                const schema = rpcResponseSchema.helData[handler.method];
                if (schema) {
                    const response = schema.patch(schema.identity, data);
                    handler.handler(response);
                }
            }
        }

        const stateSchema = this.stateSchema;
        const ackStatePacket = {
            type: HelPacketType.ACK_STATE,
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
                    stateHandler(nextState, nextTick);
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
                case HelPacketType.MESSAGE:
                    return handleMessage(packet.data);
                case HelPacketType.RPC:
                    return handleRPC(packet.data, packet.id);
                case HelPacketType.RPC_RESPONSE:
                    return handleRPCResponse(packet.data, packet.id);
                case HelPacketType.STATE:
                    return handleState(packet.baseTick, packet.data, packet.nextTick);
                case HelPacketType.ACK_STATE:
                    return handleAckState(packet.tick);
                case HelPacketType.DROP_STATE:
                    return handleDropState(packet.tick);
            }
        }

        return onPacket;
    }

    public createMessageDispatch (sockets:HelSocket[]) : MessageInterface<MessageTable>['api'] {
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
                    type: HelPacketType.MESSAGE,
                    data: serialized,
                });
                for (let i = 0; i < sockets.length; ++i) {
                    sockets[i].send(rawData);
                }
            };
        });
        return result;
    }

    public createPRCCallDispatch (socket:HelSocket, rpcReplies:HelRPCReplies) : RPCInterface<RPCTable>['api']  {
        const result = <RPCInterface<RPCTable>['api']>{};
        /*
        const argSchema = this.rpcArgsSchema;
        Object.keys(this.rpcTable).forEach((method) => {
            const packet = argSchema.alloc();
            packet.type = method;
            result[method] = (arg:any, cb?:(err?:any, result?:any) => any) => {
                packet.data = arg;
                const serialized = argSchema.diff(argSchema.identity, packet);
                packet.data = null;

                if (cb) {
                }
                return onRPC(method, serialized, cb);
            };
        });
        */
        return result;
    }

    public dispatchState (localStates:HelStateSet<StateSchema>, observations:number[][], sockets:HelSocket[], bufferSize:number) {
        observations.push(localStates.ticks);
        const baseTick = mostRecentCommonState(observations);
        observations.pop();

        const baseIndex = localStates.at(baseTick);
        const baseState = localStates.states[baseIndex];

        const nextTick = localStates.ticks[localStates.ticks.length - 1];
        const nextState = localStates.states[localStates.states.length - 1];

        const data = JSON.stringify({
            type: HelPacketType.STATE,
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
