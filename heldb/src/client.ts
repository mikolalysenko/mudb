import { HelSocket } from 'helnet/net';
import HelModel from 'helschema/model';
import HelUnion = require('helschema/union');

import {
    HelStateSet,
    pushState,
    garbageCollectStates,
    destroyStateSet } from './lib/state-set';
import {
    HelProtocol,
    FreeModel,
    MessageTableBase,
    MessageInterface,
    RPCTableBase,
    RPCInterface,
    HelRPCReplies,
    HelStateReplica } from './lib/protocol';

class HelRemoteServer<
    StateSchema extends FreeModel,
    MessageTable extends MessageTableBase,
    RPCTable extends RPCTableBase> implements HelStateReplica<StateSchema> {
    public past:HelStateSet<StateSchema['identity']>;
    public state:StateSchema['identity'];
    public schema:StateSchema;
    public tick:number = 0;
    public windowLength:number = 0;

    public readonly message:MessageInterface<MessageTable>['api'];
    public readonly rpc:RPCInterface<RPCTable>['api'];

    constructor (
        windowLength:number,
        schema:StateSchema,
        message:MessageInterface<MessageTable>['api'],
        rpc:RPCInterface<RPCTable>['api']) {
        this.windowLength = windowLength;
        this.past = new HelStateSet(schema.clone(schema.identity));
        this.state = this.past.states[this.past.states.length - 1];
        this.schema = schema;
        this.message = message;
        this.rpc = rpc;
    }
}

class HelClient<
    ClientStateSchema extends FreeModel,
    ClientMessageTable extends MessageTableBase,
    ClientRPCTable extends RPCTableBase,
    ServerStateSchema extends FreeModel,
    ServerMessageTable extends MessageTableBase,
    ServerRPCTable extends RPCTableBase> {
    public readonly sessionId:string;

    public past:HelStateSet<ClientStateSchema['identity']>;
    public state:ClientStateSchema['identity'];
    public schema:ClientStateSchema;
    public tick:number = 0;
    public windowLength:number = 0;

    public server:HelRemoteServer<ServerStateSchema, ServerMessageTable, ServerRPCTable>;

    private _socket:HelSocket;

    public running:boolean = false;
    private _started:boolean = false;
    private _closed:boolean = false;

    // internal protocol variables
    private _protocol:HelProtocol<ServerStateSchema, ClientMessageTable, ClientRPCTable>;
    private _remoteProtocol:HelProtocol<ClientStateSchema, ServerMessageTable, ServerRPCTable>;
    private _serverStates:number[][] = [[0]];
    private _rpcReplies:HelRPCReplies = new HelRPCReplies();

    constructor(spec:{
        socket:HelSocket,

        windowLength:number,

        clientStateSchema:ClientStateSchema,
        clientMessageTable:ClientMessageTable,
        clientRPCTable:ClientRPCTable,

        serverStateSchema:ServerStateSchema,
        serverMessageTable:ServerMessageTable,
        serverRPCTable:ServerRPCTable,
    }) {
        this._socket = spec.socket;
        this.sessionId = spec.socket.sessionId;

        this.state = spec.clientStateSchema.clone(spec.clientStateSchema.identity);
        this.past = new HelStateSet(spec.clientStateSchema.clone(spec.clientStateSchema.identity));
        this.schema = spec.clientStateSchema;
        this.windowLength = spec.windowLength;

        this._protocol = new HelProtocol(spec.serverStateSchema, spec.clientMessageTable, spec.clientRPCTable);
        this._remoteProtocol = new HelProtocol(spec.clientStateSchema, spec.serverMessageTable, spec.serverRPCTable);
    }

    public start (spec:{
        message:MessageInterface<ClientMessageTable>['api'],
        rpc:RPCInterface<ClientRPCTable>['api'],
        ready:(err?:any) => void,
        state:(state:ServerStateSchema['identity'], tick:number) => void,
        close:() => void,
    }) {
        if (this._started) {
            setTimeout(() => spec.ready('server already started'));
            return;
        }
        this._started = true;

        this.server = new HelRemoteServer(
            this.windowLength,
            this._protocol.stateSchema,
            this._remoteProtocol.createMessageDispatch([this._socket]),
            this._remoteProtocol.createPRCCallDispatch(this._socket, this._rpcReplies));

        const parsePacket = this._protocol.createParser({
            socket: this._socket,
            replica: this.server,
            messageHandlers: spec.message,
            rpcHandlers: spec.rpc,
            rpcReplies: this._rpcReplies,
            observations: this._serverStates[0],
            stateHandler: spec.state,
        });

        this._socket.start({
            ready: (err?:any) => {
                if (err) {
                    this._closed = true;
                    return spec.ready(err);
                }
                this.running = true;
                spec.ready();
            },
            message: parsePacket,
            unreliableMessage: parsePacket,
            close: () => {
                this.running = false;
                this._closed = true;

                // cancel all pending RPC
                this._rpcReplies.cancel();

                // call close
                spec.close();

                // clean up states
                destroyStateSet(this.server.schema, this.server.past);
                destroyStateSet(this.schema, this.past);
                this.schema.free(this.state);
            },
        });
    }

    // commits current state, publish to server
    public commit () {
        if (!this.running) {
            throw new Error('client not running');
        }

        // save state
        const past = this.past;
        pushState(past, ++this.tick, this.schema.clone(this.state));

        // send to server
        this._remoteProtocol.dispatchState(past, this._serverStates, [this._socket], this.windowLength);
    }

    // destroy the client instance
    public close () {
        this._socket.close();
    }
}

export = function createHelClient<
    ClientStateSchema extends FreeModel,
    ClientMessageTable extends MessageTableBase,
    ClientRPCTable extends RPCTableBase,
    ServerStateSchema extends FreeModel,
    ServerMessageTable extends MessageTableBase,
    ServerRPCTable extends RPCTableBase> (spec:{
        socket:HelSocket,
        windowLength?:number,
        protocol:{
            client:{
                state:ClientStateSchema,
                message:ClientMessageTable,
                rpc:ClientRPCTable,
            },
            server:{
                state:ServerStateSchema,
                message:ServerMessageTable,
                rpc:ServerRPCTable,
            },
        },
    }) {

    return new HelClient<
        ClientStateSchema,
        ClientMessageTable,
        ClientRPCTable,
        ServerStateSchema,
        ServerMessageTable,
        ServerRPCTable>({
            socket: spec.socket,
            windowLength: spec.windowLength || 0,
            clientStateSchema: spec.protocol.client.state,
            clientMessageTable: spec.protocol.client.message,
            clientRPCTable: spec.protocol.client.rpc,
            serverStateSchema: spec.protocol.server.state,
            serverMessageTable: spec.protocol.server.message,
            serverRPCTable: spec.protocol.server.rpc,
        });
};