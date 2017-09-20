import { HelSocket } from 'helnet/net';
import HelModel from 'helschema/model';
import { HelStateSet, pushState, updateStateSet, mostRecentCommonState } from './lib/state-set';
import { HelStatistic } from './lib/statistic';

import { PacketType } from './lib/packet';

type FreeModel = HelModel<any>;
type RPCType = { 0: FreeModel, 1: FreeModel } | [FreeModel, FreeModel];
type MessageType = FreeModel;

class HelRemoteServer<
    ServerState,
    ServerModel extends FreeModel,
    ServerRPCInterface,
    ServerMessageInterface> {
    public past:HelStateSet<ServerState>;
    public model:ServerModel;

    public readonly message:ServerMessageInterface;
    public readonly rpc:ServerRPCInterface;
};

class HelClient<
    ClientState,
    ClientModel extends FreeModel,
    ClientRPCInterface,
    ClientMessageInterface, 
    ClientMessageSchema extends HelModel<any>,
    ServerState,
    ServerModel extends FreeModel,
    ServerRPCInterface, 
    ServerMessageInterface,
    RemoteServer extends HelRemoteServer<ServerState, ServerModel, ServerRPCInterface, ServerMessageInterface>> {
    public readonly sessionId:string;

    public past:HelStateSet<ClientState>;
    public state:ClientState;
    public model:ClientModel;

    public socket:HelSocket;

    public tick:number;

    public server:RemoteServer;
    private _serverStates:number[] = [0];

    public running:boolean = false;
    private _started:boolean = false;
    private _closed:boolean = false;

    private _clientMessageSchema:ClientMessageSchema;

    constructor({socket}:{
        socket:HelSocket,

        clientMessageSchema:ClientMessageSchema,
        clientRPCSchema:ClientRPCSchema,

        serverMessage:ServerMessageInterface,
        serverRPC:ServerRPCInterface,
    }) {
        this.socket = socket;
        this.sessionId = socket.sessionId;
    }

    public start (spec : {
        rpc:ClientRPCInterface,
        message:ClientMessageInterface,
        tick: () => void,
        ready: (err?:any) => void,
        close: () => void,
    }) {
        if (this._started) {
            setTimeout(() => spec.ready('server already started'));
            return;
        }
        this._started = true;

        const handleRPC = (args:any, responseId?:number) => {
        };

        const handleRPCResponse = (args:any, responseId:number) => {
        };

        const handleMessage = (argData:any) => {
            const schema = this._clientMessageSchema;
            const args = schema.patch(schema.identity, argData);
            const handler = spec.message[args.type];
            if (handler) {
                handler.call(this, args.data);
            }
            schema.free(args);
        };

        const handleState = (baseTick:number, patch:any, nextTick:number) => {
            const past = this.server.past;
            const baseIndex = past.at(baseTick);
            if (baseIndex >= 0 && past.ticks[baseIndex] === baseTick) {
                const baseState = past.states[baseIndex];
                const schema = this.server.model;
                const nextState = schema.patch(baseState, patch);
                pushState(past, nextTick, nextState);
            }
        };

        const handleUpdateStateSet = (ack:number[], drop:number[]) => {
            updateStateSet(this._serverStates, ack, drop);
        };

        const handlePing = (clock:number) => {
        };

        const handlePong = (clock:number) => {
        };

        this.socket.start({
            ready(err?:any) {
                if (err) {
                    this._closed = true;
                    return spec.ready(err);
                }
                this.running = true;
                

                spec.ready();
            },
            message (message) {
                if (typeof message !== 'string') {
                    return;
                }
                const packet = JSON.parse(message);
                switch (packet.type) {
                    case PacketType.RPC:
                        return handleRPC(packet.data, packet.rpcId);
                    case PacketType.RPC_RESPONSE:
                        return handleRPCResponse(packet.data, packet.rpcId);
                    case PacketType.MESSAGE:
                        return handleMessage(packet.data);
                }
            },
            unreliableMessage (message) {
                if (typeof message !== 'string') {
                    return;
                }
                const packet = JSON.parse(message);
                switch (packet.type) {
                    case PacketType.STATE:
                        return handleState(packet.baseTick, packet.patch, packet.nextTick);
                    case PacketType.UPDATE_STATE_SET:
                        return handleUpdateStateSet(packet.ack, packet.drop);
                    case PacketType.PING:
                        return handlePing(packet.clock);
                    case PacketType.PONG:
                        return handlePong(packet.clock);
                }
            },
            close () {
                // cancel all pending RPC callbacks
            }
        })
    }

    // poll for events, call once-per-frame
    public poll () {
        if (!this.running) {
            throw new Error('client not running');
        }

        // update tick counter
    }

    // commits current state, publish to server
    public commit () {
        if (!this.running) {
            throw new Error('client not running');
        }
        
        // save state
        const past = this.past;
        pushState(past, this.tick, this.model.clone(this.state));

        // find reference state
        const baseStateTick = mostRecentCommonState([past.ticks, this._serverStates]);
        const baseStateIndex = past.at(baseStateTick);
        const baseState = past.states[baseStateIndex];
        
        // send packet
        const packet = {
            type: PacketType.STATE,
            baseTick: baseStateTick,
            nextTick: this.tick,
            patch: this.model.diff(baseState, this.state),
        };
        this.socket.sendUnreliable(JSON.stringify(packet));
    }

    // destroy the client instance
    public close () {
        this.socket.close();
    }
}

function createHelClient<
    ClientModelType extends FreeModel, 
    ClientRPCTable extends { [method:string]:RPCType },
    ClientMessageTable extends { [event:string]:MessageType },
    ServerModelType extends FreeModel,
    ServerRPCTable extends { [method:string]:RPCType },
    ServerMessageTable extends { [event:string]:MessageType } > (
    { protocol, socket } : {
        protocol : {
            client: {
                state: ClientModelType,
                rpc: ClientRPCTable,
                message: ClientMessageTable
            },
            server: {
                state: ServerModelType,
                rpc: ServerRPCTable,
                message: ServerMessageTable
            }
        },
        socket : HelSocket
    }) {
    type ClientRPCInterface = {
        [method in keyof ClientRPCTable]: (
            args:ClientRPCTable[method]["0"]["identity"], 
            cb:(err:any, result?:ClientRPCTable[method]["1"]["identity"]) => void) => void
    };

    type ClientMessageInterface = {
        [method in keyof ClientMessageTable]: (data:ClientMessageTable[method]["identity"]) => void
    };
    
    type ServerState = ServerModelType["identity"];

    type ServerRPCInterface = {
        [method in keyof ServerRPCTable]: (
            args:ServerRPCTable[method]["0"]["identity"], 
            cb:(err:any, result?:ServerRPCTable[method]["1"]["identity"]) => void) => void
    };

    type ServerMessageInterface = {
        [method in keyof ServerMessageTable]: (data:ServerMessageTable[method]["identity"]) => void
    };

    type RemoteServer = HelRemoteServer<ServerState, ServerModelType, ServerRPCInterface, ServerMessageInterface>;

    return new HelClient<
        ClientModelType["identity"],
        ClientModelType,
        ClientRPCInterface,
        ClientMessageInterface,
        ServerModelType["identity"],
        ServerModelType,
        ServerRPCInterface,
        ServerMessageInterface,
        RemoteServer>({
            serverMessage: {},
            serverRPC: {},
        });
}
