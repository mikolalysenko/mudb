import { MuSchema } from 'muschema/schema';
import { MuStruct } from 'muschema/struct';
import { MuUint32 } from 'muschema/uint32';

import { MuDictionary } from 'muschema/dictionary';
import { MuString } from 'muschema/string';
import { MuArray } from 'muschema/array';
import { MuVoid } from 'muschema/void';

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
            next?:(err:MuRPCError|undefined, response?:RPCTable[method]['1']['identity']) => void //callback
        ) => void
    };
    handlerAPI:{
        [method in keyof RPCTable]:(
            arg:RPCTable[method]['0']['identity'],
            next:(err:MuRPCError|undefined, response?:RPCTable[method]['1']['identity']) => void //callback
        ) => void
    };
}

export const DefaultRPCSchema = {
    client: {
        rpc: new MuString(),
    },
    server: {
        rpc: new MuString(),
    }
}

