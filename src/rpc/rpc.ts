import { MuSchema } from '../schema/schema';
import { MuStruct } from '../schema/struct';
import { MuUint32 } from '../schema/uint32';
import { MuUTF8 } from '../schema/utf8';
import { MuRPCRemoteClient } from './server';

export type MuAnySchema = MuSchema<any>;
export type MuRPCSchema = [ MuAnySchema, MuAnySchema ];
export interface MuRPCTable {
    [method:string]:MuRPCSchema;
}
export interface MuRPCProtocolSchema {
    client:MuRPCTable;
    server:MuRPCTable;
}

export type MuRPCError = string;
export interface MuRPCInterface<RPCTable extends MuRPCTable> {
    callerAPI:{
        [method in keyof RPCTable]:(
            arg:RPCTable[method][0]['identity'],
            callback?:(response:RPCTable[method][1]['identity']) => void,
        ) => void
    };
    clientHandlerAPI:{
        [method in keyof RPCTable]:(
            arg:RPCTable[method][0]['identity'],
            next:(err:MuRPCError|undefined, response?:RPCTable[method][1]['identity']) => void,
        ) => void
    };
    serverHandlerAPI:{
        [method in keyof RPCTable]:(
            arg:RPCTable[method][0]['identity'],
            next:(err:MuRPCError|undefined, response?:RPCTable[method][1]['identity']) => void,
            client?:MuRPCRemoteClient<RPCTable>,
        ) => void
    };
}

export type MuRPCProtocolTablePhase<RPCTable extends MuRPCTable, Phase extends 0 | 1> = {
    [method in keyof RPCTable]:MuStruct<{
        base:RPCTable[method][Phase];
        id:MuUint32;
    }>;
};

export type MuRPCProtocolSchemaUnfolded<ProtocolSchema extends MuRPCProtocolSchema> = [
    {
        client:MuRPCProtocolTablePhase<ProtocolSchema['client'], 0>;
        server:MuRPCProtocolTablePhase<ProtocolSchema['server'], 0>;
    },
    {
        client:MuRPCProtocolTablePhase<ProtocolSchema['server'], 1>;
        server:MuRPCProtocolTablePhase<ProtocolSchema['client'], 1>;
    }
];

export function unfoldRPCProtocolSchema<ProtocolSchema extends MuRPCProtocolSchema> (
    schema:ProtocolSchema,
) : MuRPCProtocolSchemaUnfolded<ProtocolSchema> {
    const result = [
        { client: {}, server: {} },
        { client: {}, server: {} },
    ] as MuRPCProtocolSchemaUnfolded<ProtocolSchema>;
    const CallbackIDSchema = new MuUint32();

    Object.keys(schema.client).forEach((method) => {
        result[0].client[method] = new MuStruct({
            base: schema.client[method][0],
            id: CallbackIDSchema,
        });
        result[1].server[method] = new MuStruct({
            base: schema.client[method][1],
            id: CallbackIDSchema,
        });
    });
    Object.keys(schema.server).forEach((method) => {
        result[0].server[method] = new MuStruct({
            base: schema.server[method][0],
            id: CallbackIDSchema,
        });
        result[1].client[method] = new MuStruct({
            base: schema.server[method][1],
            id: CallbackIDSchema,
        });
    });

    return result;
}

export function MuRPC<
    ArgumentSchema extends MuAnySchema,
    ResponseSchema extends MuAnySchema
> (arg:ArgumentSchema, response:ResponseSchema) : [ArgumentSchema, ResponseSchema] {
    return [arg, response];
}

export const MuRPCErrorSchema = new MuStruct({
    message: new MuUTF8(),
    id: new MuUint32(),
});

export const MuRPCErrorProtocolSchema = {
    client: {
        error: MuRPCErrorSchema,
    },
    server: {
        error: MuRPCErrorSchema,
    },
};
