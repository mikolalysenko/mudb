import { MuSchema } from '../schema/schema';
import { MuStruct } from '../schema/struct';
import { MuUint32 } from '../schema/uint32';
import { MuUTF8 } from '../schema/utf8';
import { MuRPCRemoteClient } from './server';

// Remote Procedure Call, a response-request protocol
export namespace RPC {
    export type Schema = [MuSchema<any>, MuSchema<any>];
    export type SchemaTable = { [proc:string]:Schema };
    export type ProtocolSchema = {
        client:SchemaTable;
        server:SchemaTable;
    };

    type Req = 0;
    type Res = 1;
    type Phase = Req | Res;

    type MaybeError = string | undefined;

    export type API<Table extends SchemaTable> = {
        caller:{
            [proc in keyof Table]:(
                arg:Table[proc][Req]['identity'],
                callback?:(ret:Table[proc][Res]['identity']) => void,
            ) => void
        };
        clientProcedure:{
            [proc in keyof Table]:(
                arg:Table[proc][Req]['identity'],
                next:(err:MaybeError, ret?:Table[proc][Res]['identity']) => void,
            ) => void
        };
        serverProcedure:{
            [proc in keyof Table]:(
                arg:Table[proc][Req]['identity'],
                next:(err:MaybeError, ret?:Table[proc][Res]['identity']) => void,
                client?:MuRPCRemoteClient<Table>,
            ) => void
        }
    };

    type CallbackSchemaTable<Table extends SchemaTable, P extends Phase> = {
        [proc in keyof Table]:MuStruct<{
            id:MuUint32;
            base:Table[proc][P];
        }>
    };

    export type TransposedProtocolSchema<S extends ProtocolSchema> = [
        {
            client:CallbackSchemaTable<S['client'], Req>;
            server:CallbackSchemaTable<S['server'], Req>;
        },
        {
            client:CallbackSchemaTable<S['client'], Res>;
            server:CallbackSchemaTable<S['server'], Res>;
        }
    ];

    export function transpose<S extends ProtocolSchema> (
        protocolSchema:S,
    ) : TransposedProtocolSchema<S> {
        // tuple type is not inferred
        const transposed = [
            { client: {}, server: {} }, // request protocol schema
            { client: {}, server: {} }, // response protocol schema
        ] as TransposedProtocolSchema<S>;

        const req:Req = 0;
        const res:Res = 1;
        const callbackIdSchema = new MuUint32();

        Object.keys(protocolSchema.client).forEach((proc) => {
            const reqRes = protocolSchema.client[proc];
            transposed[req].client[proc] = new MuStruct({
                id: callbackIdSchema,
                base: reqRes[req],
            });
            transposed[res].server[proc] = new MuStruct({
                id: callbackIdSchema,
                base: reqRes[res],
            });
        });
        Object.keys(protocolSchema.server).forEach((proc) => {
            const reqRes = protocolSchema.server[proc];
            transposed[req].server[proc] = new MuStruct({
                id: callbackIdSchema,
                base: reqRes[req],
            });
            transposed[res].client[proc] = new MuStruct({
                id: callbackIdSchema,
                base: reqRes[res],
            });
        });

        return transposed;
    }

    const errorSchema = new MuStruct({
        id: new MuUint32(),
        message: new MuUTF8(),
    });

    export const errorProtocolSchema = {
        client: {
            error: errorSchema,
        },
        server: {
            error: errorSchema,
        },
    };
}

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

// user-friendly tuple type assertion
export function tuple<
    ArgumentSchema extends MuSchema<any>,
    ReturnSchema extends MuSchema<any>,
> (
    arg:ArgumentSchema,
    ret:ReturnSchema,
) : [ArgumentSchema, ReturnSchema] {
    return [arg, ret];
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
