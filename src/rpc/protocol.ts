import { MuSchema } from '../schema/schema';
import { MuUnion, MuVarint, MuUTF8 } from '../schema';

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
    api:RPCTable;
};

export class MuRPCSchemas<Protocol extends MuRPCProtocol<any>> {
    public errorSchema = new MuUTF8();
    public tokenSchema = new MuVarint();
    public argSchema:MuUnion<{
        [method in keyof Protocol['api']]:Protocol['api']['arg'];
    }>;
    public retSchema:MuUnion<{
        [method in keyof Protocol['api']]:Protocol['api']['ret'];
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
        const methods = Object.keys(protocol.api);
        for (let i = 0; i < methods.length; ++i) {
            const m = methods[i];
            const s = protocol.api[m];
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

export interface MuRPCClientTransport<Protocol extends MuRPCProtocol<any>> {
    send:(
        schema:MuRPCSchemas<Protocol>,
        rpc:MuRPCSchemas<Protocol>['argSchema']['identity']) =>
            Promise<MuRPCSchemas<Protocol>['responseSchema']['identity']>;
}

export interface MuRPCConnection {
    auth:string;
    setAuth:(auth:string) => void;
}

export interface MuRPCServerTransport<Protocol extends MuRPCProtocol<any>, Connection extends MuRPCConnection> {
    listen:(
        schemas:MuRPCSchemas<Protocol>,
        authorize:(connection:Connection) => Promise<boolean>,
        recv:(
            connection:Connection,
            rpc:MuRPCSchemas<Protocol>['argSchema']['identity'],
            response:MuRPCSchemas<Protocol>['responseSchema']['identity']) => Promise<void>) => void;
}
