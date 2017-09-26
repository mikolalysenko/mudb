import { HelSocketServer, HelSocket } from 'helnet/net';
import HelModel from 'helschema/model';

import { HelStateSet, destroyStateSet, pushState } from './lib/state-set';
import {
    HelProtocol,
    FreeModel,
    MessageTableBase,
    MessageInterface,
    RPCTableBase,
    RPCInterface,
    HelRPCReplies,
    HelStateReplica } from './lib/protocol';

class HelRemoteClient<
    StateSchema extends FreeModel,
    MessageTable extends MessageTableBase,
    RPCTable extends RPCTableBase> implements HelStateReplica<StateSchema> {
    public readonly sessionId:string;

    public past:HelStateSet<StateSchema['identity']>;
    public state:StateSchema['identity'];
    public schema:StateSchema;
    public tick:number = 0;

    public readonly message:MessageInterface<MessageTable>['api'];
    public readonly rpc:RPCInterface<RPCTable>['api'];

    constructor (
        sessionId:string,
        schema:StateSchema,
        message:MessageInterface<MessageTable>['api'],
        rpc:RPCInterface<RPCTable>['api']) {
        this.sessionId = sessionId;
        this.past = new HelStateSet(schema.clone(schema.identity));
        this.schema = schema;
        this.message = message;
        this.rpc = rpc;
    }
}

function removeFromList<T> (array:T[], item:T) {
    const idx = array.indexOf(item);
    if (idx >= 0) {
        array.splice(idx, 1);
    }
}

class HelServer<
    ClientStateSchema extends FreeModel,
    ClientMessageTable extends MessageTableBase,
    ClientRPCTable extends RPCTableBase,
    ServerStateSchema extends FreeModel,
    ServerMessageTable extends MessageTableBase,
    ServerRPCTable extends RPCTableBase> {
    public past:HelStateSet<ServerStateSchema>;
    public state:ServerStateSchema['identity'];
    public schema:ServerStateSchema;
    public tick:number = 0;

    public clients:HelRemoteClient<ClientStateSchema, ClientMessageTable, ClientRPCTable>[] = [];
    public broadcast:MessageInterface<ClientMessageTable>['api'];

    private _socketServer:HelSocketServer;
    private _sockets:HelSocket[] = [];

    public running:boolean = false;
    private _started:boolean = false;
    private _closed:boolean = false;

    private _protocol:HelProtocol<ClientStateSchema, ServerMessageTable, ServerRPCTable>;
    private _remoteProtocol:HelProtocol<ServerStateSchema, ClientMessageTable, ClientRPCTable>;
    private _stateObservations:number[][] = [];

    constructor(spec:{
        socketServer:HelSocketServer,

        clientStateSchema:ClientStateSchema,
        clientMessageTable:ClientMessageTable,
        clientRPCTable:ClientRPCTable,

        serverStateSchema:ServerStateSchema,
        serverMessageTable:ServerMessageTable,
        serverRPCTable:ServerRPCTable,
    }) {
        this.past = new HelStateSet(spec.serverStateSchema.clone(spec.serverStateSchema.identity));
        this.state = spec.serverStateSchema.clone(spec.serverStateSchema.identity);
        this.schema = spec.serverStateSchema;

        this._socketServer = spec.socketServer;

        this._protocol = new HelProtocol(spec.clientStateSchema, spec.serverMessageTable, spec.serverRPCTable);
        this._remoteProtocol = new HelProtocol(spec.serverStateSchema, spec.clientMessageTable, spec.clientRPCTable);

        this.broadcast = this._remoteProtocol.createMessageDispatch(this._sockets);
    }

    public start (spec:{
        message:{
            [name in keyof ServerMessageTable]:(
                client:HelRemoteClient<ClientStateSchema, ClientMessageTable, ClientRPCTable>,
                message:ServerMessageTable[name]['identity']) => void;
        };
        rpc:{
            [method in keyof ServerRPCTable]:(
                client:HelRemoteClient<ClientStateSchema, ClientMessageTable, ClientRPCTable>,
                args:ServerRPCTable[method]['0']['identity'],
                cb?:(err?:any, result?:ServerRPCTable[method]['1']['identity']) => void) => void;
        };
        ready:(err?:any) => void;
        connect:(client:HelRemoteClient<ClientStateSchema, ClientMessageTable, ClientRPCTable>) => void;
        state:(
            client:HelRemoteClient<ClientStateSchema, ClientMessageTable, ClientRPCTable>,
            state:ClientStateSchema['identity'],
            tick:number) => void;
        disconnect:(client:HelRemoteClient<ClientStateSchema, ClientMessageTable, ClientRPCTable>) => void;
    }) {
        type Client = HelRemoteClient<ClientStateSchema, ClientMessageTable, ClientRPCTable>;

        this._socketServer.start({
            ready: (err?:any) => {
                if (err) {
                    return spec.ready(err);
                }
                this.running = true;
                // set up broadcast table

                spec.ready();
            },
            connection: (socket:HelSocket) => {
                const rpcReplies = new HelRPCReplies();
                const observations:number[] = [0];
                const client:Client = new HelRemoteClient(
                    socket.sessionId,
                    this._protocol.stateSchema,
                    this._remoteProtocol.createMessageDispatch([socket]),
                    this._remoteProtocol.createPRCCallDispatch(socket, rpcReplies));

                const messageHandlers = <MessageInterface<ClientMessageTable>['api']>{};
                Object.keys(spec.message).forEach((message) => {
                    const handler = spec.message[message];
                    messageHandlers[message] = function (x) { return handler(client, x); };
                });

                const rpcHandlers = <RPCInterface<ClientRPCTable>['api']>{};
                Object.keys(spec.rpc).forEach((method) => {
                    const handler = spec.rpc[method];
                    rpcHandlers[method] = function (x, y) {
                        if (arguments.length === 1) {
                            return handler(client, x);
                        }
                        return handler(client, x, y);
                    };
                });

                const stateHandler = function (state:ClientStateSchema['identity'], tick:number) {
                    return spec.state(client, state, tick);
                };

                const parsePacket = this._protocol.createParser({
                    socket,
                    replica: client,
                    messageHandlers,
                    rpcHandlers,
                    rpcReplies,
                    observations,
                    stateHandler,
                });

                this._sockets.push(socket);

                socket.start({
                    ready: (err?:any) => {
                        if (err) {
                            console.log(err);
                            return;
                        }

                        // add to client list
                        this.clients.push(client);
                        this._stateObservations.push(observations);

                        // send most recent state replica to client
                        if (this.tick > 0) {
                            this._remoteProtocol.dispatchState(
                                this.past,
                                [observations],
                                [socket]);
                        }

                        // fire connect callback
                        spec.connect(client);
                    },
                    message: parsePacket,
                    unreliableMessage: parsePacket,
                    close: () => {
                        // destroy client
                        rpcReplies.cancel();

                        // call disconnect handler
                        spec.disconnect(client);

                        // remove client from data set
                        removeFromList(this.clients, client);
                        removeFromList(this._stateObservations, observations);
                        removeFromList(this._sockets, socket);

                        // release client states
                        destroyStateSet(client.schema, client.past);
                    },
                });
            },
        });
    }

    // commit current state, publish to all clients
    public commit () {
        if (!this.running) {
            return;
        }
        const past = this.past;

        console.log('committing state');

        // append state to log
        const nextState = this.schema.clone(this.state);
        pushState(past, ++this.tick, nextState);

        this._remoteProtocol.dispatchState(past, this._stateObservations, this._sockets);
    }

    // destroy everything
    public close () {
        if (!this.running) {
            return;
        }
        this._socketServer.close();
        destroyStateSet(this.schema, this.past);
        this.schema.free(this.state);
    }
}

export = function createHelServer<
    ClientStateSchema extends FreeModel,
    ClientMessageTable extends MessageTableBase,
    ClientRPCTable extends RPCTableBase,
    ServerStateSchema extends FreeModel,
    ServerMessageTable extends MessageTableBase,
    ServerRPCTable extends RPCTableBase> (
    spec:{
        socketServer:HelSocketServer,
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
    return new HelServer<
        ClientStateSchema,
        ClientMessageTable,
        ClientRPCTable,
        ServerStateSchema,
        ServerMessageTable,
        ServerRPCTable>({
            socketServer: spec.socketServer,
            clientStateSchema: spec.protocol.client.state,
            clientMessageTable: spec.protocol.client.message,
            clientRPCTable: spec.protocol.client.rpc,
            serverStateSchema: spec.protocol.server.state,
            serverMessageTable: spec.protocol.server.message,
            serverRPCTable: spec.protocol.server.rpc,
        });
};
