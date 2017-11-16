import {
    MuSchema,
    MuStruct,
    MuDictionary,
    MuString,
    MuArray,
    MuVoid,
    MuFloat32,
    MuBoolean,
    MuInt8,
    MuUnion,
} from 'muschema';

export type MuRPCError = string;

export type MuAnySchema = MuSchema<any>;

export type MuRPCSchema = {
    0:MuAnySchema; // call args
    1:MuAnySchema; // response data
} | [ MuAnySchema, MuAnySchema ];

export type MuRPCTable = {
    [method:string]:MuRPCSchema;
};

export type MuRPCProtocolSchema = {
    client:MuRPCTable;
    server:MuRPCTable;
};

export interface MuRPCInterface<RPCTable extends MuRPCTable> {
    callAPI:{
        [method in keyof RPCTable]:(
            arg:RPCTable[method]['0']['identity'],
            next?:(err:MuRPCError|undefined, response?:RPCTable[method]['1']['identity']) => void, //callback
        ) => void
    };
    handlerAPI:{
        [method in keyof RPCTable]:(
            arg:RPCTable[method]['0']['identity'],
            next:(err:MuRPCError|undefined, response?:RPCTable[method]['1']['identity']) => void, //callback
        ) => void
    };
}

export const DefaultRPCSchema = {
    client: {
        call: new MuStruct({
            id: new MuString(),
            methodName: new MuString(),
            arg: new MuArray(new MuInt8()), //FIXME: arg type should be same as the schema in examples
        }),
        response: new MuStruct({
            id: new MuString(),
            err: new MuString(), //FIXME: err maybe undefined
            response: new MuInt8(), //FIXME: response maybe undefined
        }),
    },
    server: {
        call: new MuStruct({
            id: new MuString(),
            methodName: new MuString(),
            arg: new MuArray(new MuInt8()),
        }),
        response: new MuStruct({
            id: new MuString(),
            err: new MuString(),
            response: new MuInt8(),
        }),
    },
};

export function generateId() {
    return (Date.now() + Math.random()).toString();
}
