import { HelSocket } from 'helnet/net';
import HelModel from 'helschema/model';
import HelUnion = require('helschema/union');

import { HelStateSet, pushState, mostRecentCommonState, destroyStateSet } from './lib/state-set';
import { HelProtocol, FreeModel, MessageTableBase, RPCTableBase, HelRPCReplies } from './lib/protocol';

class HelRemoteServer<
    ServerStateSchema extends FreeModel,
    ServerMessageInterface,
    ServerRPCInterface> {
    public past:HelStateSet<ServerStateSchema>;
    public schema:ServerStateSchema;

    public readonly message:ServerMessageInterface;
    public readonly rpc:ServerRPCInterface;

    constructor (schema:ServerStateSchema, message:ServerMessageInterface, rpc:ServerRPCInterface) {
        this.past = new HelStateSet(schema.clone(schema.identity));
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

    public server:HelRemoteServer<
        ServerStateSchema,
        { [message in keyof ServerMessageTable]:(event:ServerMessageTable[message]['identity']) => void; },
        { [rpc in keyof ServerRPCTable]:(
            args:ServerRPCTable[rpc]['0']['identity'],
            cb?:(err?:any, result?:ServerRPCTable[rpc]['1']['identity']) => void) => void; }>;

    public socket:HelSocket;

    public tick:number;

    public running:boolean = false;
    private _started:boolean = false;
    private _closed:boolean = false;

    // internal protocol variables
    private _protocol:HelProtocol<ServerStateSchema, ClientMessageTable, ClientRPCTable>;
    private _remoteProtocol:HelProtocol<ClientStateSchema, ServerMessageTable, ServerRPCTable>;
    private _serverStates:number[] = [0];
    private _rpcReplies:HelRPCReplies = new HelRPCReplies();

    constructor(spec:{
        socket:HelSocket,

        clientStateSchema:ClientStateSchema,
        clientMessageTable:ClientMessageTable,
        clientRPCTable:ClientRPCTable,

        serverStateSchema:ServerStateSchema,
        serverMessageTable:ServerMessageTable,
        serverRPCTable:ServerRPCTable,
    }) {
        this.socket = spec.socket;
        this.sessionId = spec.socket.sessionId;

        this.state = spec.clientStateSchema.clone(spec.clientStateSchema.identity);

        this._protocol = new HelProtocol(spec.serverStateSchema, spec.clientMessageTable, spec.clientRPCTable);
        this._remoteProtocol = new HelProtocol(spec.clientStateSchema, spec.serverMessageTable, spec.serverRPCTable);
    }

    public start (spec:{
        message:{ [message in keyof ClientMessageTable]:(event:ClientMessageTable[message]['identity']) => void; },
        rpc:{
            [method in keyof ClientRPCTable]:(
                args:ClientRPCTable[method]['0']['identity'],
                cb?:(err?:any, result?:ClientRPCTable[method]['1']['identity']) => void) => void; },
        ready:(err?:any) => void,
        close:() => void,
    }) {
        if (this._started) {
            setTimeout(() => spec.ready('server already started'));
            return;
        }
        this._started = true;

        this.server = new HelRemoteServer(
            this._protocol.stateSchema,
            this._remoteProtocol.createMessageDispatch(this.socket),
            this._remoteProtocol.createPRCCallDispatch(this.socket, this._rpcReplies));

        const parsePacket = this._protocol.createParser({
            socket: this.socket,
            stateSet: this.server.past,
            messageHandlers: spec.message,
            rpcHandlers: spec.rpc,
            rpcReplies: this._rpcReplies,
            observations: this._serverStates,
        });

        this.socket.start({
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
        /*
        if (!this.running) {
            throw new Error('client not running');
        }

        // save state
        const past = this.past;
        pushState(past, this.tick, this.schema.clone(this.state));

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
        */
    }

    // destroy the client instance
    public close () {
        this.socket.close();
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
            clientStateSchema: spec.protocol.client.state,
            clientMessageTable: spec.protocol.client.message,
            clientRPCTable: spec.protocol.client.rpc,
            serverStateSchema: spec.protocol.server.state,
            serverMessageTable: spec.protocol.server.message,
            serverRPCTable: spec.protocol.server.rpc,
        });
};