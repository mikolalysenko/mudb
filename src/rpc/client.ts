import { MuRPCProtocol, MuRPCSchemas, MuRPCTypes, MuRPCClientTransportFactory, MuRPCClientTransport } from './protocol';
import { MuLogger } from '../logger';

export class MuRPCClient<Protocol extends MuRPCProtocol<any>> {
    public api:MuRPCTypes<Protocol>['api'];

    public schemas:MuRPCSchemas<Protocol>;
    public transport:MuRPCClientTransport<Protocol>;

    private _tokenCounter = 0;
    private _handlers:{
        [token:number]:{
            resolve:(x:any) => void,
            reject:(x:any) => void,
        },
    } = {};

    private _createRPC (method:keyof Protocol['methods']) {
        const callSchema = this.schemas.callSchema;
        const methodSchema = this.schemas.protocol.methods[method].arg;
        return (arg:typeof methodSchema['identity']) => {
            const packet = callSchema.alloc();
            const token = packet.token = this._tokenCounter++;
            packet.arg.type = method;
            packet.arg.data = methodSchema.clone(arg);
            return new Promise<any>((resolve, reject) => {
                this._handlers[token] = { resolve, reject };
                this.transport.send(packet);
                callSchema.free(packet);
            });
        };
    }

    constructor (spec:{
        transport:MuRPCClientTransportFactory,
        protocol:Protocol,
        logger?:MuLogger,
    }) {
        const logger = spec.logger;
        const schemas = this.schemas = new MuRPCSchemas(spec.protocol);
        this.transport = spec.transport.clientTransport({
            schemas,
            recv: (rpcResponse) => {
                const { token,  response } = rpcResponse;
                const handler = this._handlers[token];
                if (handler) {
                    if (response.type === 'error') {
                        handler.reject(response.data);
                    } else if (response.type === 'success') {
                        const { type, data } = <this['schemas']['retSchema']['identity']>response.data;
                        const typeSchema = this.schemas.retSchema.muData[type];
                        if (typeSchema) {
                            response.type = 'error';
                            response.data = '';
                            handler.resolve(data);
                        } else {
                            logger && logger.error(`internal error: invalid rpc response, return type = ${type}`);
                            handler.reject('internal error, bad return type');
                        }
                    } else {
                        logger && logger.error(`internal error: invalid rpc response, header type = ${response.type}`);
                        handler.reject(`internal error, bad response type`);
                    }
                } else {
                    logger && logger.error(`invalid rpc response token: ${token}`);
                }
                schemas.responseSchema.free(<any>rpcResponse);
            },
        });
        const api = this.api = <any>{};
        const methods = Object.keys(spec.protocol.methods);
        for (let i = 0; i < methods.length; ++i) {
            const method = methods[i];
            api[method] = this._createRPC(method);
        }
    }
}