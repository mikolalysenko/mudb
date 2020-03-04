import { MuSchema } from '../schema/schema';
import { MuUnion, MuVarint, MuStruct, MuUTF8, MuVoid } from '../schema';

export type MuRPCTableEntry<
    ArgsSchema extends MuSchema<any>,
    ReturnSchema extends MuSchema<any>> = {
    arg:ArgsSchema;
    ret:ReturnSchema;
};

export type MuRPCTable = {
    [method:string]:MuRPCTableEntry<any, any>;
};

export type MuRPCProtocol<RPCTable extends MuRPCTable> = {
    name:string;
    methods:RPCTable;
};

export class MuRPCSchemas<Protocol extends MuRPCProtocol<any>> {
    public errorSchema = new MuUTF8();
    public tokenSchema = new MuVarint();
    public argSchema:MuUnion<{
        [method in keyof Protocol['methods']]:Protocol['methods']['arg'];
    }>;
    public retSchema:MuUnion<{
        [method in keyof Protocol['methods']]:Protocol['methods']['ret'];
    }>;
    public responseSchema:MuUnion<{
        success:MuRPCSchemas<Protocol>['retSchema'];
        error:MuRPCSchemas<Protocol>['errorSchema'];
    }>;
    public error (message:string) {
        const result = this.responseSchema.alloc();
        result.type = 'error';
        result.data = message;
        return result;
    }

    constructor(
        public protocol:Protocol,
    ) {
        const argTable:any = {};
        const retTable:any = {};
        const methods = Object.keys(protocol.methods);
        for (let i = 0; i < methods.length; ++i) {
            const m = methods[i];
            const s = protocol.methods[m];
            argTable[m] = s.arg;
            retTable[m] = s.ret;
        }
        this.argSchema = new MuUnion(argTable);
        this.retSchema = new MuUnion(retTable);
        this.responseSchema = new MuUnion({
            success: this.retSchema,
            error: this.errorSchema,
        });
    }
}

export interface MuRPCTypes<Protocol extends MuRPCProtocol<any>> {
    authorize:(token:string) => Promise<boolean>;
    api:{
        [method in keyof Protocol['methods']]:
            (arg:Protocol['methods'][method]['arg']['identity']) =>
                Promise<Protocol['methods'][method]['ret']['identity']>;
    };
    handlers:{
        [method in keyof Protocol['methods']]:
            (auth:string, arg:Protocol['methods'][method]['arg']['identity'], ret:Protocol['methods'][method]['ret']['identity']) =>
                Promise<Protocol['methods'][method]['ret']['identity']>;
    };
}

export interface MuRPCClientTransport<Protocol extends MuRPCProtocol<any>> {
    send:(
        schema:MuRPCSchemas<Protocol>,
        rpc:MuRPCSchemas<Protocol>['argSchema']['identity']) =>
            Promise<MuRPCSchemas<Protocol>['responseSchema']['identity']>;
}

export interface MuRPCServerTransport<Protocol extends MuRPCProtocol<any>> {
    listen:(
        schemas:MuRPCSchemas<Protocol>,
        recv:(
            auth:string,
            rpc:MuRPCSchemas<Protocol>['argSchema']['identity'],
            response:MuRPCSchemas<Protocol>['responseSchema']['identity']) => Promise<void>) => void;
}
