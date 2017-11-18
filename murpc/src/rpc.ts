import { MuSchema } from 'muschema/schema';
import { MuStruct } from 'muschema/struct';
import { MuUint32 } from 'muschema/uint32';
import { MuString } from 'muschema/string';

export type MuRPCError = string;

export type MuAnySchema = MuSchema<any>;

export type MuRPCSchema = {
    0:MuAnySchema;
    1:MuAnySchema;
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
            next?:(err:MuRPCError|undefined, response?:RPCTable[method]['1']['identity']) => void) => void
    };
    handlerAPI:{
        [method in keyof RPCTable]:(
            arg:RPCTable[method]['0']['identity'],
            next:(err:MuRPCError|undefined, response?:RPCTable[method]['1']['identity']) => void) => void
    };
}

export interface MuRPCProtocolTablePhase<RPCTable extends MuRPCTable, Phase extends '0' | '1'> {
    schema:{
        [method in keyof RPCTable]:MuStruct<{
            base:RPCTable[method][Phase];
            id:MuUint32;
        }>;
    };
}

export interface MuRPCProtocolSchemaPhase<ProtocolSchema extends MuRPCProtocolSchema, Phase extends '0' | '1'> {
    client:MuRPCProtocolTablePhase<ProtocolSchema['client'], Phase>['schema'];
    server:MuRPCProtocolTablePhase<ProtocolSchema['server'], Phase>['schema'];
}

export interface MuRPCProtocolSchemaInterface<ProtocolSchema extends MuRPCProtocolSchema> {
    '0':MuRPCProtocolSchemaPhase<ProtocolSchema, '0'>;
    '1':MuRPCProtocolSchemaPhase<ProtocolSchema, '1'>;
}

export function createRPCProtocolSchemas<ProtocolSchema extends MuRPCProtocolSchema>(
    schema:ProtocolSchema) : MuRPCProtocolSchemaInterface<ProtocolSchema> {
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
    protocolSchema[1].client['error'] = new MuStruct({
        base: new MuString(),
        id: new MuUint32(),
    });
    protocolSchema[1].server['error'] = new MuStruct({
        base: new MuString(),
        id: new MuUint32(),
    });
    return <MuRPCProtocolSchemaInterface<ProtocolSchema>>protocolSchema;
}

export function generateID() {
    return (Date.now() + Math.random()) * 10000;
}
