import HelModel from '../helschema/src/model';

type FreeModel = HelModel<any, any>
type RPCType = { 0: FreeModel, 1: FreeModel } | [FreeModel, FreeModel]
type MessageType = FreeModel

class HelClient<
    ClientRPCInterface, 
    ClientMessageInterface, 
    ServerRPCInterface, 
    ServerMessageInterface> {

    public state:Timeline<ClientModel>;

    public readonly message:ServerMessageInterface;
    public readonly rpc:ServerRPCInterface;

    public peers:HelRemote[];

    constructor(spec : {
        message:ServerMessageInterface,
        rpc:ServerRPCInterface,
    }) {
    }

    public start (spec : {
        rpc:ClientRPCInterface,
        message:ClientMessageInterface,
        tick: () => void,
        ready: (err?:any) => void
    }) {
    }
}

function createClient<
    ClientModelType extends FreeModel, 
    ClientRPCTable extends { [method:string]:RPCType },
    ClientMessageTable extends { [event:string]:MessageType },
    ServerModelType extends FreeModel,
    ServerRPCTable extends { [method:string]:RPCType },
    ServerMessageTable extends { [event:string]:MessageType } > (
    schema : {
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
    }) {
    type ClientRPCInterface = {
        [method in keyof ClientRPCTable]: (
            args:ClientRPCTable[method][0]["identity"], 
            cb:(err:any, result?:ClientRPCTable[method][1]["identity"]) => void) => void
    };

    type ClientMessageInterface = {
        [method in keyof ClientMessageTable]: (data:ClientMessageTable[method]["identity"]) => void
    };
    
    type ServerRPCInterface = {
        [method in keyof ServerRPCTable]: (
            args:ServerRPCTable[method][0]["identity"], 
            cb:(err:any, result?:ServerRPCTable[method][1]["identity"]) => void) => void
    };

    type ServerMessageInterface = {
        [method in keyof ServerMessageTable]: (data:ServerMessageTable[method]["identity"]) => void
    };
}
