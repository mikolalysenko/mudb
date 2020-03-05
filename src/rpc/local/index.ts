import { MuRPCSchemas, MuRPCClientTransport, MuRPCServerTransport, MuRPCProtocol, MuRPCConnection } from '../protocol';

export class MuRPCLocalClient<Protocol extends MuRPCProtocol<any>>
    implements MuRPCClientTransport<Protocol>, MuRPCConnection {
    constructor (
        public auth:string,
        private _handlers:{
            [name:string]:(auth:MuRPCLocalClient<Protocol>, rpc:any) => Promise<any>;
        },
    ) {}

    public setAuth (auth:string) {
        this.auth = auth;
    }

    public async send (
        schemas:MuRPCSchemas<Protocol>,
        args:MuRPCSchemas<Protocol>['argSchema']['identity']) {
        const handler = this._handlers[schemas.protocol.name];
        if (!handler) {
            throw new Error('server not registered');
        }
        const json = await handler(this, schemas.argSchema.toJSON(args));
        return schemas.responseSchema.fromJSON(json);
    }
}

export class MuRPCLocalTransport implements MuRPCServerTransport<any, MuRPCLocalClient<any>> {
    private _handlers:{
        [name:string]:(auth:MuRPCLocalClient<any>, rpc:any) => Promise<any>;
    } = {};

    public client<Protocol extends MuRPCProtocol<any>> (auth:string) {
        return new MuRPCLocalClient<Protocol>(auth, this._handlers);
    }

    public listen<Protocol extends MuRPCProtocol<any>> (
        schemas:MuRPCSchemas<Protocol>,
        auth:(conn:MuRPCLocalClient<Protocol>) => Promise<boolean>,
        recv:(
            conn:MuRPCLocalClient<Protocol>,
            rpc:MuRPCSchemas<Protocol>['argSchema']['identity'],
            response:MuRPCSchemas<Protocol>['responseSchema']['identity']) => Promise<void>) {
        this._handlers[schemas.protocol.name] = async (client, json) => {
            const response = schemas.responseSchema.alloc();
            try {
                if (!await auth(client)) {
                    throw new Error('unauthorized access');
                }
                const parsed = schemas.argSchema.fromJSON(json);
                await recv(client, parsed, response);
                schemas.argSchema.free(parsed);
            } catch (e) {
                response.type = 'error';
                if (e instanceof Error && e.stack) {
                    response.data = e.stack;
                } else {
                    response.data = '' + e ;
                }
            }
            const result = schemas.responseSchema.toJSON(response);
            schemas.responseSchema.free(response);
            return result;
        };
        return {};
    }
}