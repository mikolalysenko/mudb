import { MuRPCProtocol, MuRPCSchemas, MuRPCTypes, MuRPCClientTransport } from './protocol';

export class MuRPCClient<Protocol extends MuRPCProtocol<any>> {
    public api:MuRPCTypes<Protocol>['api'];

    public schemas:MuRPCSchemas<Protocol>;
    public transport:MuRPCClientTransport<Protocol>;

    private _handleResponse = (response) => {
        const { type, data } = response;
        response.type = 'error';
        response.data = '';
        this.schemas.responseSchema.free(response);
        if (type === 'success') {
            return data;
        } else {
            throw data;
        }
    }

    private _createRPC (method:keyof Protocol['methods']) {
        return (arg) => {
            const rpc = this.schemas.argSchema.alloc();
            rpc.type = method;
            rpc.data = arg;
            return this.transport.send(this.schemas, rpc).then(this._handleResponse);
        };
    }

    constructor (
        protocol:Protocol,
        transport:MuRPCClientTransport<Protocol>) {
        this.schemas = new MuRPCSchemas(protocol);
        this.transport = transport;
        const api = this.api = <any>{};
        const methods = Object.keys(protocol.methods);
        for (let i = 0; i < methods.length; ++i) {
            const method = methods[i];
            api[method] = this._createRPC(method);
        }
    }
}