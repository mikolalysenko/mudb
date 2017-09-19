import { HelSocket } from 'helnet/net';
import HelModel from 'helschema/model';
import HelClock from 'helclock';
import { HelStateSet } from './lib/state-set';
import { HelStatistic } from './lib/statistic';

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
    ServerState,
    ServerModel extends FreeModel,
    ServerRPCInterface, 
    ServerMessageInterface> {
    public readonly sessionId:string;

    public past:HelStateSet<ClientState>;
    public state:ClientState;
    public model:ClientModel;

    public socket:HelSocket;
    public ping:HelStatistic;
    public tickTime:HelStatistic;
    public frameTime:HelStatistic;

    public tick:number;

    public server:HelRemoteServer<ServerState, ServerModel, ServerRPCInterface, ServerMessageInterface>;

    public running:boolean = false;
    private _started:boolean = false;
    private _closed:boolean = false;

    constructor(spec:{
        serverMessage:ServerMessageInterface,
        serverRPC:ServerRPCInterface,
    }) {
    }

    public start (spec : {
        rpc?:ClientRPCInterface,
        message?:ClientMessageInterface,
        tick?: () => void,
        ready?: (err?:any) => void
    }) {
    }

    // poll for events, call once-per-frame
    public poll () {
    }

    // commits current state, publish to server
    public commit () {
    }

    // destroy the client instance
    public close () {
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
    
    type ServerRPCInterface = {
        [method in keyof ServerRPCTable]: (
            args:ServerRPCTable[method]["0"]["identity"], 
            cb:(err:any, result?:ServerRPCTable[method]["1"]["identity"]) => void) => void
    };

    type ServerMessageInterface = {
        [method in keyof ServerMessageTable]: (data:ServerMessageTable[method]["identity"]) => void
    };

    return new HelClient<
        ClientModelType["identity"],
        ClientModelType,
        ClientRPCInterface,
        ClientMessageInterface,
        ServerModelType["identity"],
        ServerModelType,
        ServerRPCInterface,
        ServerMessageInterface>({
            serverMessage: {},
            serverRPC: {},
        });
}
