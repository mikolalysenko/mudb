import { HelSocket, HelSocketServer } from 'helnet/net';
import HelModel from 'helschema/model';
import { HelStateSet } from './lib/state-set';
import { HelStatistic, pushSample } from './lib/statistic';

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
}

class HelServer<
    ClientState,
    ClientModel extends FreeModel,
    ClientRPCInterface,
    ClientMessageInterface, 
    ServerState,
    ServerModel extends FreeModel,
    ServerRPCInterface, 
    ServerMessageInterface,
    RemoteClient extends HelRemoteClient<ClientState, ClientModel, ClientRPCInterface, ClientMessageInterface>> {
    public past:HelStateSet<ServerState>;
    public state:ServerState;
    public model:ServerModel;

    public clients:RemoteClient;

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
        connect: (client:RemoteClient) => void,
    }) {
        if (this._closed) {
            process.nextTick(() => {
                spec.ready('server closed');
            });
            return;
        }
        if (this._started) {
            process.nextTick(() => {
                spec.ready('server already started');
            });
            return;
        }
        this._started = true;
        this.socketServer.start({
        });
    }

    // commits current state, publish to all clients
    public commit () {
    }

    // destr
    public close () {
    }
}

function createHelServer<
    ClientModelType extends FreeModel, 
    ClientRPCTable extends { [method:string]:RPCType },
    ClientMessageTable extends { [event:string]:MessageType },
    ServerModelType extends FreeModel,
    ServerRPCTable extends { [method:string]:RPCType },
    ServerMessageTable extends { [event:string]:MessageType } > (
    { protocol, server } : {
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
        server : HelSocketServer
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
