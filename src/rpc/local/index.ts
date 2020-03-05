import { MuRPCSchemas, MuRPCClientTransport, MuRPCServerTransport, MuRPCProtocol, MuRPCConnection } from '../protocol';

export class MuRPCLocalClientTransport<Protocol extends MuRPCProtocol<any>> implements MuRPCClientTransport<Protocol> {
    constructor (
        public auth:string,
        private _handlers:{
            [name:string]:(auth:string, rpc:any) => Promise<any>;
        },
    ) {}

    public async send (
        schemas:MuRPCSchemas<Protocol>,
        args:MuRPCSchemas<Protocol>['argSchema']['identity']) {
        const handler = this._handlers[schemas.protocol.name];
        if (!handler) {
            throw new Error('server not registered');
        }
        const json = await handler(this.auth, schemas.argSchema.toJSON(args));
        return schemas.responseSchema.fromJSON(json);
    }
}

export class MuRPCLocalConnection implements MuRPCConnection {
    constructor (public auth:string) {}
}

export class MuRPCLocalTransport implements MuRPCServerTransport<any, MuRPCLocalConnection> {
    private _handlers:{
        [name:string]:(auth:string, rpc:any) => Promise<any>;
    } = {};

    public client<Protocol extends MuRPCProtocol<any>> (auth:string) {
        return new MuRPCLocalClientTransport<Protocol>(auth, this._handlers);
    }

    public listen<Protocol extends MuRPCProtocol<any>> (
        schemas:MuRPCSchemas<Protocol>,
        recv:(
            conn:MuRPCLocalConnection,
            rpc:MuRPCSchemas<Protocol>['argSchema']['identity'],
            response:MuRPCSchemas<Protocol>['responseSchema']['identity']) => Promise<void>) {
        this._handlers[schemas.protocol.name] = async (auth, json) => {
            const parsed = schemas.argSchema.fromJSON(json);
            const response = schemas.responseSchema.alloc();
            await recv(new MuRPCLocalConnection(auth), parsed, response);
            const result = schemas.responseSchema.toJSON(response);
            schemas.argSchema.free(parsed);
            schemas.responseSchema.free(response);
            return result;
        };
        return {};
    }
}