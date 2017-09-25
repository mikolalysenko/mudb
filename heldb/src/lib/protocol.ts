import HelModel from 'helschema/model';
import HelUnion = require('helschema/union');
import { HelSocket } from 'helnet/net';
import { HelStateSet, pushState } from './state-set';

export type FreeModel = HelModel<any>;
export type MessageType = FreeModel;
export type MessageTableBase = { [message:string]:MessageType };

export type RPCType = { 0:FreeModel, 1:FreeModel } | [FreeModel, FreeModel];
export type RPCTableBase = { [event:string]:RPCType };

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
    public readonly messageSchema:HelModel<{
        type:keyof MessageTable,
        data:MessageTable[keyof MessageTable]['identity'],
    }>;

    public readonly rpcTable:RPCTable;
    public readonly rpcArgsSchema:HelModel<{
        type:keyof RPCTable,
        data:RPCTable[keyof RPCTable]['0']['identity'],
    }>;
    public readonly rpcResponseSchema:HelModel<{
        type:keyof RPCTable,
        data:RPCTable[keyof RPCTable]['1']['identity'],
    }>;

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
        stateSet,
        messageHandlers,
        rpcHandlers,
        rpcReplies,
        observations }:{
        socket:HelSocket,
        stateSet:HelStateSet<StateSchema['identity']>,
        observations:number[],
        messageHandlers:{
            [message in keyof MessageTable]:(event:MessageTable[message]['identity']) => void;
        },
        rpcHandlers:{
            [rpc in keyof RPCTable]:(
                args:RPCTable[rpc]['0']['identity'],
                cb?:(err?:any, result?:RPCTable[rpc]['1']['identity']) => void) => void;
        },
        rpcReplies:HelRPCReplies,
    }) : (packet:any) => void {
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
            const baseIndex = stateSet.at(baseTick);
            if (baseIndex >= 0 && stateSet.ticks[baseIndex] === baseTick) {
                const baseState = stateSet.states[baseIndex];
                const nextState = stateSchema.patch(baseState, patch);
                pushState(stateSet, nextTick, nextState);
                ackStatePacket.tick = nextTick;
                socket.sendUnreliable(JSON.stringify(ackStatePacket));
            }
        }

        function handleAckState (tick:number) {
            // add tick to state set
        }

        function handleDropState (tick:number) {
            // drop all ticks in state set
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

    public createMessageDispatch (socket:HelSocket) : {
        [message in keyof MessageTable]:(event:MessageTable[message]['identity']) => void;
    } {
        const result = {};
        const schema = this.messageSchema;
        Object.keys(this.messageTable).forEach((message) => {
            const packet = schema.alloc();
            packet.type = message;
            result[message] = (data:any) => {
                packet.data = data;
                const serialized = schema.diff(schema.identity, packet);
                packet.data = null;
                socket.send(JSON.stringify(serialized));
            };
        });

        type MessageInterface = {
            [message in keyof MessageTable]:(event:MessageTable[message]['identity']) => void;
        };
        return <MessageInterface>result;
    }

    public createPRCCallDispatch (onRPC:(method:string, data:any, cb?:(err?:any, result?:any) => void) => void) : {
        [rpc in keyof RPCTable]:(
            args:RPCTable[rpc]['0']['identity'],
            cb?:(err?:any, result?:RPCTable[rpc]['1']['identity']) => void) => void;
    }  {
        const result = {};
        const argSchema = this.rpcArgsSchema;
        Object.keys(this.rpcTable).forEach((method) => {
            const packet = argSchema.alloc();
            packet.type = method;
            result[method] = (arg:any, cb?:(err?:any, result?:any) => any) => {
                packet.data = arg;
                const serialized = argSchema.diff(argSchema.identity, packet);
                packet.data = null;
                return onRPC(method, serialized, cb);
            };
        });

        type RPCInterface = {
            [rpc in keyof RPCTable]:(
                args:RPCTable[rpc]['0']['identity'],
                cb?:(err?:any, result?:RPCTable[rpc]['1']['identity']) => void) => void;
        };

        return <RPCInterface>result;
    }
}
