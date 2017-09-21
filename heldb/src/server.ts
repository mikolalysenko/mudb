import { HelSocket } from 'helnet/net';
import HelModel from 'helschema/model';

import { HelStateSet, mostRecentCommonState, pushState } from './lib/state-set';
import { HelStatistic, pushSample } from './lib/statistic';
import { PacketType } from './lib/packet';

type FreeModel = HelModel<any>;
type RPCType = { 0: FreeModel, 1: FreeModel } | [FreeModel, FreeModel];
type MessageType = FreeModel;

class HelRemoteClient<
    ClientState,
    ClientModel extends FreeModel,
    ClientRPCInterface,
    ClientMessageInterface> {
    public readonly sessionId:string;

    public past:HelStateSet<ClientState>;
    public model:ClientModel;

    public ping:HelStatistic;

    public socket:HelSocket;

    public readonly rpc:ClientRPCInterface;
    public readonly message:ClientMessageInterface;

    private _server;
    public _knownStates:number[] = [];
}

class HelServer<
    ClientState,
    ClientModel extends FreeModel,
    ClientRPCInterface,
    ClientMessageInterface, 
    ServerState,
    ServerModel extends FreeModel,
    ServerRPCInterface, 
    ServerMessageInterface> {
    public past:HelStateSet<ServerState>;
    public state:ServerState;
    public model:ServerModel;

    public clients:HelRemoteClient<ClientState, ClientModel, ClientRPCInterface, ClientMessageInterface>[];

    public tick:number;
    public readonly tickRate:number;
    private tickInterval:number;
    
    public socketServer:HelSocketServer;

    public running:boolean = false;
    private _started:boolean = false;
    private _closed:boolean = false;

    constructor(spec:{
        clientMessage:ClientMessageInterface,
        clientRPC:ClientRPCInterface,
    }) {
    }

    public start (spec : {
        rpc:ServerRPCInterface,
        message:ServerMessageInterface,
        tickRate:number,
        tick: () => void,
        ready: (err?:any) => void,
        connect: (client:HelRemoteClient<ClientState, ClientModel, ClientRPCInterface, ClientMessageInterface>) => void,
    }) {
        type Client = HelRemoteClient<ClientState, ClientModel, ClientRPCInterface, ClientMessageInterface>;

        if (this._started) {
            setTimeout(() => {
                spec.ready('server already started');
            }, 0);
            return;
        }
        this._started = true;

        const handleMessage = (client:Client, data) => {
        };

        const handleRPC = (client:Client, data, responseId:number) => {
        };

        const handleRPCResponse = (client:Client, data, responseId:number) => {
        };

        const handleState = (client:Client, baseTick:number, data, nextTick:number) => {
            // update client state
        };

        const handleStateSetUpdate = (client:Client, ack:number[], drop:number[]) => {
            // update observed state set
        };

        this.socketServer.start({
            ready (err?:any) {
                if (err) {
                    return spec.ready(err);
                }
                this.running = true;
                spec.ready();
            },
            connect (socket:HelSocket) {
                const client = new HelRemoteClient<ClientState, ClientModel, ClientRPCInterface, ClientMessageInterface>();
                socket.start({
                    ready (err?:any) {
                        if (err) {
                            console.log(err);
                            return;
                        }
                        // add to client list
                        this.clients.push(client);

                        // send initial state snapshot
                        socket.sendUnreliable(JSON.stringify({
                            type: PacketType.STATE,
                            baseTick: 0,
                            nextTick: this.past.ticks[this.past.ticks.length - 1],
                            patch: this.model.diff(this.model.identity, this.past.states[this.past.states.length - 1]),
                        }));

                        // fire connect callback
                        spec.connect(client);
                    },
                    message (message) {
                        const packet = JSON.parse(message);
                        switch (packet.type) {
                            case PacketType.MESSAGE:
                                return handleMessage(client, packet.data);
                            case PacketType.RPC:
                                return handleRPC(client, packet.data, packet.responseId);
                            case PacketType.RPC_RESPONSE:
                                return handleRPCResponse(client, packet.data, packet.responseId);
                        }
                    },
                    unreliableMessage (message) {
                        const packet = JSON.parse(message);
                        switch (packet.type) {
                            case PacketType.STATE:
                                return handleState(client, packet.baseTick, packet.patch, packet.nextTick);
                            case PacketType.UPDATE_STATE_SET:
                                return handleStateSetUpdate(client, packet.ack, packet.drop);
                        }
                    },
                    close () {
                        // destroy client
                    }
                })
            }
        });
    }

    // commit current state, publish to all clients
    public commit () {
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
    }

    // destroy everything
    public close () {
        if (!this.running) {
            return;
        }
        this.socketServer.close();
    }
}

export default function createHelServer<
    ClientModelType extends FreeModel, 
    ClientRPCTable extends { [method:string]:RPCType },
    ClientMessageTable extends { [event:string]:MessageType },
    ServerModelType extends FreeModel,
    ServerRPCTable extends { [method:string]:RPCType },
    ServerMessageTable extends { [event:string]:MessageType } > (
    { protocol, socketServer } : {
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
        socketServer : HelSocketServer
    }) {
    type ClientState = ClientModelType["identity"];

    type ClientRPCInterface = {
        [method in keyof ClientRPCTable]: (
            args:ClientRPCTable[method]["0"]["identity"], 
            cb:(err:any, result?:ClientRPCTable[method]["1"]["identity"]) => void) => void
    };

    type ClientMessageInterface = {
        [method in keyof ClientMessageTable]: (data:ClientMessageTable[method]["identity"]) => void
    };

    type RemoteClient = HelRemoteClient<ClientState, ClientModelType, ClientRPCInterface, ClientMessageInterface>;
    
    type ServerState = ServerModelType["identity"];

    type ServerRPCInterface = {
        [method in keyof ServerRPCTable]: (
            args:ServerRPCTable[method]["0"]["identity"], 
            cb:(err:any, client:RemoteClient, result?:ServerRPCTable[method]["1"]["identity"]) => void) => void
    };

    type ServerMessageInterface = {
        [method in keyof ServerMessageTable]: (client:RemoteClient, data:ServerMessageTable[method]["identity"]) => void
    };

    return new HelServer<
        ClientState,
        ClientModelType,
        ClientRPCInterface,
        ClientMessageInterface,
        ServerState,
        ServerModelType,
        ServerRPCInterface,
        ServerMessageInterface,
        RemoteClient>({
            clientMessage: {},
            clientRPC: {},
        });
}
