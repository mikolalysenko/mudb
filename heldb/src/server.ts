import { HelSocketServer, HelSocket } from 'helnet/net';
import HelModel from 'helschema/model';

import { HelStateSet, destroyStateSet } from './lib/state-set';
import { HelProtocol, FreeModel, MessageTableBase, RPCTableBase, HelRPCReplies } from './lib/protocol';

class HelRemoteClient<
    ClientSchema extends FreeModel,
    ClientMessageInterface,
    ClientRPCInterface> {
    public readonly sessionId:string;

    public past:HelStateSet<ClientSchema>;
    public schema:ClientSchema;

    public socket:HelSocket;

    public readonly message:ClientMessageInterface;
    public readonly rpc:ClientRPCInterface;

    constructor (socket:HelSocket, schema:ClientSchema, message:ClientMessageInterface, rpc:ClientRPCInterface) {
        this.socket = socket;
        this.sessionId = socket.sessionId;
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

    public tick:number = 1;

    public clients:HelRemoteClient<
        ClientStateSchema,
        { [message in keyof ClientMessageTable]:(event:ClientMessageTable[message]['identity']) => void; },
        { [rpc in keyof ClientRPCTable]:(
            args:ClientRPCTable[rpc]['0']['identity'],
            cb?:(err?:any, result?:ClientRPCTable[rpc]['1']['identity']) => void) => void; }>[];
    public broadcast:{ [message in keyof ClientMessageTable]:(event:ClientMessageTable[message]['identity']) => void; };

    public socketServer:HelSocketServer;

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
        this.schema = spec.serverStateSchema.identity;

        this.socketServer = spec.socketServer;

        // TODO: initialize broadcast messages

        this._protocol = new HelProtocol(spec.clientStateSchema, spec.serverMessageTable, spec.serverRPCTable);
        this._remoteProtocol = new HelProtocol(spec.serverStateSchema, spec.clientMessageTable, spec.clientRPCTable);
    }

    public start (spec:{
        message:{ [message in keyof ServerMessageTable]:(event:ServerMessageTable[message]['identity']) => void; },
        rpc:{
            [method in keyof ServerRPCTable]:(
                args:ServerRPCTable[method]['0']['identity'],
                cb?:(err?:any, result?:ServerRPCTable[method]['1']['identity']) => void) => void; },
        ready:(err?:any) => void,
        connect:(client:HelRemoteClient<
            ClientStateSchema,
            { [message in keyof ClientMessageTable]:(event:ClientMessageTable[message]['identity']) => void; },
            { [rpc in keyof ClientRPCTable]:(
                args:ClientRPCTable[rpc]['0']['identity'],
                cb?:(err?:any, result?:ClientRPCTable[rpc]['1']['identity']) => void) => void; }>) => void,
        }) {
        type Client = HelRemoteClient<
            ClientStateSchema,
            { [message in keyof ClientMessageTable]:(event:ClientMessageTable[message]['identity']) => void; },
            { [rpc in keyof ClientRPCTable]:(
                args:ClientRPCTable[rpc]['0']['identity'],
                cb?:(err?:any, result?:ClientRPCTable[rpc]['1']['identity']) => void) => void; }>;

        this.socketServer.start({
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
                const observations:number[] = [];
                const client:Client = new HelRemoteClient(
                    socket,
                    this._protocol.stateSchema,
                    this._remoteProtocol.createMessageDispatch(socket),
                    this._remoteProtocol.createPRCCallDispatch(socket, rpcReplies));

                const parsePacket = this._protocol.createParser({
                    socket,
                    stateSet: client.past,
                    messageHandlers: spec.message,
                    rpcHandlers: spec.rpc,
                    rpcReplies,
                    observations,
                });

                socket.start({
                    ready: (err?:any) => {
                        if (err) {
                            console.log(err);
                            return;
                        }

                        // add to client list
                        this.clients.push(client);
                        this._stateObservations.push(observations);

                        // fire connect callback
                        spec.connect(client);
                    },
                    message: parsePacket,
                    unreliableMessage: parsePacket,
                    close: () => {
                        // destroy client
                        rpcReplies.cancel();

                        // remove client from data set
                        removeFromList(this.clients, client);
                        removeFromList(this._stateObservations, observations);

                        // release client states
                        destroyStateSet(client.schema, client.past);
                    },
                });
            },
        });
    }

    // commit current state, publish to all clients
    public commit () {
        /*
        const past = this.past;

        // append state to log
        const nextState = this.model.clone(this.state);
        const nextTick = this.tick;
        pushState(past, nextTick, nextState);

        // find common base state
        const knownStates = [past.ticks];
        for (let i = 0; i < this.clients.length; ++i) {
            knownStates.push(this.clients[i]._knownStates);
        }
        const baseTick = mostRecentCommonState(knownStates);
        const baseState = past.states[past.at(baseTick)];

        // send packet to all clients
        const packet = JSON.stringify({
            type: PacketType.STATE,
            baseTick,
            nextTick,
            patch: this.model.patch(baseState, nextState)
        });
        for (let i = 0; i < this.clients.length; ++i) {
            this.clients[i].socket.sendUnreliable(packet);
        }
        */
    }

    // destroy everything
    public close () {
        if (!this.running) {
            return;
        }
        this.socketServer.close();
        destroyStateSet(this.schema, this.past);
        this.schema.free(this.state);
    }
}

export default function createHelServer<
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
}
