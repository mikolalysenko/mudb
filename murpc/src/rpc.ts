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

const MuAnyBasicType = new MuUnion({
    float: new MuFloat32(),
    string: new MuString(),
    int: new MuInt8(),
    boolean: new MuBoolean(),
});

const MuAnyObjectType = new MuUnion({
    array: new MuArray(MuAnyBasicType),
    dictionary: new MuDictionary(MuAnyBasicType),
});

const MuAnyType = new MuUnion({
    basic: MuAnyBasicType,
    array: new MuArray(new MuUnion({
        basic: MuAnyBasicType,
        object: MuAnyObjectType,
    })),
    dictionary: new MuDictionary(new MuUnion({
        basic: MuAnyBasicType,
        object: MuAnyObjectType,
    })),
});

export const DefaultRPCSchema = { //FIXME: 需要根据传入的schema来调整arg和response数据
    client: {
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
