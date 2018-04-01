import { MuSchema } from 'muschema/schema';
import { MuStruct } from 'muschema/struct';
import { MuUint32 } from 'muschema/uint32';
import { MuString } from 'muschema/string';
import { MuAnyMessageTable } from '../../mudb/protocol';

export type MuAnySchema = MuSchema<any>;
export type MuRPCSchema = { 0:MuAnySchema, 1:MuAnySchema } | [ MuAnySchema, MuAnySchema ];
export type MuRPCTable = { [method:string]:MuRPCSchema };

export type MuRPCProtocolSchema = {
    client:MuRPCTable;
    server:MuRPCTable;
};

export type MuRPCError = string;

export interface MuRPCInterface<RPCTable extends MuRPCTable> {
    callAPI:{
        [method in keyof RPCTable]:(
            arg:RPCTable[method]['0']['identity'],
            next?:(err:MuRPCError|undefined, response?:RPCTable[method]['1']['identity']) => void) => void
    };
    handlerAPI:{
        [method in keyof RPCTable]:(
            arg:RPCTable[method]['0']['identity'],
            next:(err:MuRPCError|undefined, response?:RPCTable[method]['1']['identity']) => void) => void
    };
}

export type MuRPCProtocolTablePhase<RPCTable extends MuRPCTable, Phase extends '0' | '1'> = {
    [method in keyof RPCTable]:MuStruct<{
        base:RPCTable[method][Phase];
        id:MuUint32;
    }>;
};

export interface MuRPCProtocolSchemaTransformed<ProtocolSchema extends MuRPCProtocolSchema> {
    '0':{
        client:MuRPCProtocolTablePhase<ProtocolSchema['client'], '0'>;
        server:MuRPCProtocolTablePhase<ProtocolSchema['server'], '0'>;
    };
    '1':{
        client:MuRPCProtocolTablePhase<ProtocolSchema['client'], '1'>;
        server:MuRPCProtocolTablePhase<ProtocolSchema['server'], '1'>;
    };
}

export function createRPCProtocolSchemas<ProtocolSchema extends MuRPCProtocolSchema> (
    schema:ProtocolSchema) : MuRPCProtocolSchemaTransformed<ProtocolSchema> {
    const protocolSchema = {};
    for (let i = 0; i < 2; ++i) {
        const result = {
            client: {},
            server: {},
        };
        Object.keys(schema.client).map((method) => result.client[method] = new MuStruct({
            base: schema.client[method][i],
            id: new MuUint32(),
        }));
        Object.keys(schema.server).map((method) => result.server[method] = new MuStruct({
            base: schema.server[method][i],
            id: new MuUint32(),
        }));
        protocolSchema[i] = result;
    }
    return <MuRPCProtocolSchemaTransformed<ProtocolSchema>>protocolSchema;
}

export const MuRPCErrorSchema = new MuStruct({
    message: new MuString(),
    id: new MuUint32(),
});

export const MuRPCErrorProtocol = {
    client: {
        error: MuRPCErrorSchema,
    },
    server: {
        error: MuRPCErrorSchema,
    },
};
