import { MuRPCClientTransportFactory, MuRPCServerTransportFactory, MuRPCSchemas } from '../protocol';

export class MuLocalRPCTransport implements MuRPCClientTransportFactory, MuRPCServerTransportFactory {
    private _activeAuthToken:string = '';
    public setAuth (auth:string) {
        this._activeAuthToken = auth;
    }

    private _handlers:{
        [name:string]:(auth:string, rpc:any) => Promise<any>;
    } = {};

    public clientTransport (spec:{
        schemas:MuRPCSchemas<any>,
        recv:(response:any) => void,
    }) {
        const name = spec.schemas.protocol.name;
        const schemas = spec.schemas;
        const auth = this._activeAuthToken;

        return {
            send:(rpc:any) => {
                const handler = this._handlers[name];
                function error(e:string) {
                    const resp = schemas.responseSchema.alloc();
                    resp.token = rpc.token;
                    resp.response.type = 'error';
                    resp.response.data = e;
                    Promise.resolve().then(() => {
                        spec.recv(resp);
                        schemas.responseSchema.free(resp);
                    }).catch(() => {});
                }
                if (!handler) {
                    error(`server not connected`);
                } else {
                    const json = schemas.callSchema.toJSON(rpc);
                    Promise.resolve().then(() => {
                        handler(auth, json)
                            .then((response) => {
                                const parsed = schemas.responseSchema.fromJSON(response);
                                spec.recv(parsed);
                                schemas.responseSchema.free(parsed);
                            })
                            .catch((e) => {
                                error(e);
                            });
                    }).catch(() => {});
                }
            },
        };
    }

    public serverTransport (spec:{
        schemas:MuRPCSchemas<any>,
        recv:(auth:string, rpc:any, response:any) => Promise<any>,
    }) {
        this._handlers[spec.schemas.protocol.name] = async (auth, json) => {
            const parsed = spec.schemas.callSchema.fromJSON(json);
            const response = spec.schemas.responseSchema.alloc();
            await spec.recv(auth, parsed, response);
            const result = spec.schemas.responseSchema.toJSON(response);
            spec.schemas.callSchema.free(parsed);
            spec.schemas.responseSchema.free(response);
            return result;
        };
        return {};
    }
}