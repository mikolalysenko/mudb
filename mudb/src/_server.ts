import { MuSocketServer, MuSocket } from 'munet/net';
import MuModel from 'muschema/model';

import {
    MuStateSet,
    destroyStateSet,
    garbageCollectStates,
    pushState } from './lib/state-set';
import {
    MuProtocolFactory,
    FreeModel,
    MessageTableBase,
    MessageInterface,
    RPCTableBase,
    RPCInterface,
    MuRPCReplies,
    MuStateReplica } from './lib/protocol';

export class MuRemoteClient<
    StateSchema extends FreeModel,
    MessageTable extends MessageTableBase,
    RPCTable extends RPCTableBase> implements MuStateReplica<StateSchema> {
    public readonly sessionId:string;

    public past:MuStateSet<StateSchema['identity']>;
    public state:StateSchema['identity'];
    public schema:StateSchema;
    public tick:number = 0;
    public windowLength:number = 0;

    public readonly message:MessageInterface<MessageTable>['api'];
    public readonly rpc:RPCInterface<RPCTable>['call'];

    constructor (
        windowLength:number,
        sessionId:string,
        schema:StateSchema,
        message:MessageInterface<MessageTable>['api'],
        rpc:RPCInterface<RPCTable>['call']) {
        this.windowLength = windowLength;
        this.sessionId = sessionId;
        this.past = new MuStateSet(schema.clone(schema.identity));
        this.state = schema.clone(schema.identity);
        this.schema = schema;
        this.message = message;
        this.rpc = rpc;
    }
}

export class MuServer<
    ClientStateSchema extends FreeModel,
    ClientMessageTable extends MessageTableBase,
    ClientRPCTable extends RPCTableBase,
    ServerStateSchema extends FreeModel,
    ServerMessageTable extends MessageTableBase,
    ServerRPCTable extends RPCTableBase> {
    public past:MuStateSet<ServerStateSchema>;
    public state:ServerStateSchema['identity'];
    public schema:ServerStateSchema;
    public tick:number = 0;

    public windowLength:number = 0;

    public clients:MuRemoteClient<ClientStateSchema, ClientMessageTable, ClientRPCTable>[] = [];
    private _sockets:MuSocket[] = [];
    private _stateObservations:number[][] = [];

    public broadcast:MessageInterface<ClientMessageTable>['api'];

    private _socketServer:MuSocketServer;

    public running:boolean = false;
    private _started:boolean = false;
    private _closed:boolean = false;

    private _protocol:MuProtocolFactory<ClientStateSchema, ServerMessageTable, ServerRPCTable>;
    private _remoteProtocol:MuProtocolFactory<ServerStateSchema, ClientMessageTable, ClientRPCTable>;

    constructor(spec:{
        windowLength:number,

        socketServer:MuSocketServer,

        clientStateSchema:ClientStateSchema,
        clientMessageTable:ClientMessageTable,
        clientRPCTable:ClientRPCTable,

        serverStateSchema:ServerStateSchema,
        serverMessageTable:ServerMessageTable,
        serverRPCTable:ServerRPCTable,
    }) {
        this.past = new MuStateSet(spec.serverStateSchema.clone(spec.serverStateSchema.identity));
        this.state = spec.serverStateSchema.clone(spec.serverStateSchema.identity);
        this.schema = spec.serverStateSchema;

        this.windowLength = spec.windowLength;

        this._socketServer = spec.socketServer;

        this._protocol = new MuProtocolFactory(spec.clientStateSchema, spec.serverMessageTable, spec.serverRPCTable);
        this._remoteProtocol = new MuProtocolFactory(spec.serverStateSchema, spec.clientMessageTable, spec.clientRPCTable);

        this.broadcast = this._remoteProtocol.createMessageDispatch(this._sockets);
    }

    public start (spec:{
        message:{
            [name in keyof ServerMessageTable]:(
                client:MuRemoteClient<ClientStateSchema, ClientMessageTable, ClientRPCTable>,
                message:ServerMessageTable[name]['identity']) => void;
        };
        rpc:{
            [method in keyof ServerRPCTable]:(
                client:MuRemoteClient<ClientStateSchema, ClientMessageTable, ClientRPCTable>,
                args:ServerRPCTable[method]['0']['identity'],
                cb:(err?:any, result?:ServerRPCTable[method]['1']['identity']) => void) => void;
        };
        ready:(err?:any) => void;
        connect:(client:MuRemoteClient<ClientStateSchema, ClientMessageTable, ClientRPCTable>) => void;
        state:(client:MuRemoteClient<ClientStateSchema, ClientMessageTable, ClientRPCTable>) => void;
        disconnect:(client:MuRemoteClient<ClientStateSchema, ClientMessageTable, ClientRPCTable>) => void;
    }) {
        type Client = MuRemoteClient<ClientStateSchema, ClientMessageTable, ClientRPCTable>;

        this._socketServer.start({
            ready: (err?:any) => {
                if (err) {
                    return spec.ready(err);
                }
                this.running = true;

                // set up broadcast table

                spec.ready();
            },
            connection: (socket:MuSocket) => {
                const rpcReplies = new MuRPCReplies();
                const observations:number[] = [0];
                const sessionId = socket.sessionId;
                const client:Client = new MuRemoteClient(
                    this.windowLength,
                    sessionId,
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
                        return handler(client, x, y);
                    };
                });

                const stateHandler = function () {
                    return spec.state(client);
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
                                [socket],
                                this.windowLength);
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
                        const index = this.clients.indexOf(client);
                        this.clients.splice(index, 1);
                        this._stateObservations.splice(index, 1);
                        this._sockets.splice(index, 1);

                        // release client states
                        destroyStateSet(client.schema, client.past);
                    },
                });
            },
        });

        return this;
    }

    // commit current state, publish to all clients
    public commit () {
        if (!this.running) {
            return;
        }
        const past = this.past;

        // append state to log
        const nextState = this.schema.clone(this.state);
        pushState(past, ++this.tick, nextState);

        this._remoteProtocol.dispatchState(past, this._stateObservations, this._sockets, this.windowLength);
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