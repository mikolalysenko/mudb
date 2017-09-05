import HelModel from '../helschema/src/model';

import HelNumber from '../helschema/src/number'
import HelStruct from '../helschema/src/struct'
import HelDictionary from '../helschema/src/dictionary'

type FreeModel = HelModel<any, any>
type RPCType = { 0: FreeModel, 1: FreeModel } | [FreeModel, FreeModel]
type MessageType = FreeModel

function createSchema<
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

    type ServerRPCInterface = {
        [method in keyof ServerRPCTable]: (
            args:ServerRPCTable[method][0]["identity"], 
            cb:(err:any, result?:ServerRPCTable[method][1]["identity"]) => void) => void
    };

    type ServerMessageInterface = {
        [method in keyof ServerMessageTable]: (data:ServerMessageTable[method]["identity"]) => void
    };

    type ServerNetInterface = {
        rpc: ServerRPCInterface,
        messages: ServerMessageInterface
    };

    return <ServerNetInterface>{};
}


const EntityModel = HelStruct({
    x: HelNumber,
    y: HelNumber,
})

const schema = {
    client: {
        state: EntityModel,
        rpc: {   
        },
        message: {
            setVoxel: HelStruct({
                x: HelNumber,
                y: HelNumber,
                z: HelNumber,
                b: HelNumber
            })
        },
    },
    server: {
        state: HelDictionary(EntityModel),
        rpc: {
            spawn: { 0: EntityModel, HelNumber },
        },
        message: {
            fire: HelNumber
        }
    }
}

const interfaces = createSchema(schema)
