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
    0:MuAnySchema; // args
    1:MuAnySchema; // callback
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

export const DefaultRPCSchema = {
    client: {
        rpc: new MuStruct({
            methodName: new MuString(),
            args: new MuArray(MuAnyType),
            next: new MuVoid(),
        }),
    },
    server: {
        rpc: new MuStruct({
            methodName: new MuString(),
            args: new MuArray(MuAnyType),
            next: new MuVoid(),
        }),
    },
};
