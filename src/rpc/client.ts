import { MuRPCProtocol, MuRPCSchemas, MuRPCClientTransport } from './protocol';
import { MuLogger, MuDefaultLogger } from '../logger';

export class MuRPCClient<Protocol extends MuRPCProtocol<any>> {
    public api:{
        [method in keyof Protocol['api']]:
            (arg:Protocol['api'][method]['arg']['identity']) =>
                Promise<Protocol['api'][method]['ret']['identity']>;
    };

    public schemas:MuRPCSchemas<Protocol>;
    public transport:MuRPCClientTransport<Protocol>;
    public logger:MuLogger;

    private _handleResponse = (response) => {
        const { type, data } = response;
        response.type = 'error';
        response.data = '';
        this.schemas.responseSchema.free(response);
        if (type === 'success') {
            return data.data;
        } else {
            this.logger.exception(data);
            throw data;
        }
    }

    private _createRPC (method:keyof Protocol['api']) {
        return (arg) => {
            const rpc = this.schemas.argSchema.alloc();
            rpc.type = method;
            rpc.data = arg;
            return this.transport.send(this.schemas, rpc).then(
                this._handleResponse,
                (reason) => {
                    this.logger.exception(reason);
                });
        };
    }

    constructor (
        protocol:Protocol,
        transport:MuRPCClientTransport<Protocol>,
        logger?:MuLogger,
    ) {
        this.schemas = new MuRPCSchemas(protocol);
        this.transport = transport;
        this.logger = logger || MuDefaultLogger;
        const api = this.api = <any>{};
        const methods = Object.keys(protocol.api);
        for (let i = 0; i < methods.length; ++i) {
            const method = methods[i];
            api[method] = this._createRPC(method);
        }
    }
}
