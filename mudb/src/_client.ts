import { MuSocket } from 'munet/net';
import MuModel from 'muschema/model';
import MuUnion = require('muschema/union');

import {
    MuStateSet,
    pushState,
    garbageCollectStates,
    destroyStateSet } from './lib/state-set';

import {
    MuProtocolFactory,
    FreeModel,
    MessageTableBase,
    MessageInterface,
    RPCTableBase,
    RPCInterface,
    MuRPCReplies,
    MuStateReplica } from './lib/protocol';

export class MuRemoteServer<
    StateSchema extends FreeModel,
    MessageTable extends MessageTableBase,
    RPCTable extends RPCTableBase> implements MuStateReplica<StateSchema> {
    public readonly past:MuStateSet<StateSchema>;
    public readonly state:StateSchema['identity'];
    public readonly schema:StateSchema;
    public tick:number = 0;
    public windowLength:number = 0;

    public readonly message:MessageInterface<MessageTable>['api'];
    public readonly rpc:RPCInterface<RPCTable>['call'];

    constructor (
        windowLength:number,
        schema:StateSchema,
        message:MessageInterface<MessageTable>['api'],
        rpc:RPCInterface<RPCTable>['call']) {
        this.windowLength = windowLength;
        this.past = new MuStateSet(schema.clone(schema.identity));
        this.state = this.past.states[this.past.states.length - 1];
        this.schema = schema;
        this.message = message;
        this.rpc = rpc;
    }
}

export class MuClient<
    ClientStateSchema extends FreeModel,
    ClientMessageTable extends MessageTableBase,
    ClientRPCTable extends RPCTableBase,
    ServerStateSchema extends FreeModel,
    ServerMessageTable extends MessageTableBase,
    ServerRPCTable extends RPCTableBase> {
    public readonly sessionId:string;

    public readonly past:MuStateSet<ClientStateSchema['identity']>;
    public state:ClientStateSchema['identity'];
    public readonly schema:ClientStateSchema;
    public tick:number = 0;
    public windowLength:number = 0;

    public server:MuRemoteServer<ServerStateSchema, ServerMessageTable, ServerRPCTable>;

    private _socket:MuSocket;

    public running:boolean = false;
    private _started:boolean = false;
    private _closed:boolean = false;

    // internal protocol variables
    private _protocol:MuProtocolFactory<ServerStateSchema, ClientMessageTable, ClientRPCTable>;
    private _remoteProtocol:MuProtocolFactory<ClientStateSchema, ServerMessageTable, ServerRPCTable>;
    private _serverStates:number[][] = [[0]];
    private _rpcReplies:MuRPCReplies = new MuRPCReplies();

    constructor(spec:{
        socket:MuSocket,

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
        this.past = new MuStateSet(spec.clientStateSchema.clone(spec.clientStateSchema.identity));
        this.schema = spec.clientStateSchema;
        this.windowLength = spec.windowLength;

        this._protocol = new MuProtocolFactory(spec.serverStateSchema, spec.clientMessageTable, spec.clientRPCTable);
        this._remoteProtocol = new MuProtocolFactory(spec.clientStateSchema, spec.serverMessageTable, spec.serverRPCTable);
    }

    public start (spec:{
        message:MessageInterface<ClientMessageTable>['api'],
        rpc:RPCInterface<ClientRPCTable>['api'],
        ready:(err?:any) => void,
        state:() => void,
        close:() => void,
    }) {
        if (this._started) {
            setTimeout(() => spec.ready('server already started'));
            return;
        }
        this._started = true;

        this.server = new MuRemoteServer(
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
