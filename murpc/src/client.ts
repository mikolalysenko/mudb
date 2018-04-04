import { MuClient, MuClientProtocol } from 'mudb/client';
import {
    MuRPCProtocolSchema,
    MuRPCErrorProtocol,
    MuRPCTable,
    MuRPCInterface,
    MuRPCProtocolSchemaTransformed,
    transformRPCProtocolSchema,
} from './rpc';

export class MuRPCRemoteServer<Schema extends MuRPCTable> {
    public readonly rpc:MuRPCInterface<Schema>['callAPI'];

    constructor(rpc:MuRPCInterface<Schema>['callAPI']) {
        this.rpc = rpc;
    }
}

const uniqueNumber = (() => {
    let current = 0;
    return () => current++;
})();

export class MuRPCClient<Schema extends MuRPCProtocolSchema> {
    public readonly sessionId:string;
    public readonly client:MuClient;
    public readonly schema:Schema;

    public server:MuRPCRemoteServer<Schema['server']>;

    private _protocolSchema:MuRPCProtocolSchemaTransformed<Schema>;
    private _callProtocol:MuClientProtocol<MuRPCProtocolSchemaTransformed<Schema>['0']>;
    private _responseProtocol:MuClientProtocol<MuRPCProtocolSchemaTransformed<Schema>['1']>;
    private _errorProtocol:MuClientProtocol<typeof MuRPCErrorProtocol>;

    private _callbacks:{ [id:string]:(err, base) => void } = {};

    constructor (client:MuClient, schema:Schema) {
        this.sessionId = client.sessionId;
        this.client = client;
        this.schema = schema;

        this._protocolSchema = transformRPCProtocolSchema(schema);
        this._callProtocol = client.protocol(this._protocolSchema['0']);
        this._responseProtocol = client.protocol(this._protocolSchema['1']);
        this._errorProtocol = client.protocol(MuRPCErrorProtocol);

        this.server = new MuRPCRemoteServer(this._createServerPRC(this._callProtocol, schema.server));
    }

    private _createServerPRC(callProtocol, serverSchema) {
        const rpc = {} as { [method in keyof Schema['server']]:(arg, next) => void };
        Object.keys(serverSchema).forEach((method) => {
            rpc[method] = (arg, next) => {
                const id = uniqueNumber();
                this._callbacks[id] = next;
                callProtocol.server.message[method]({ base: arg, id });
            };
        });
        return rpc;
    }

    public configure(spec:{
        rpc:MuRPCInterface<Schema['client']>['handlerAPI'];
        ready?:() => void;
        close?:() => void;
    }) {
        this._callProtocol.configure({
            message: ((callSchema) => {
                const handlers = {} as { [method in keyof Schema['client']]:({base, id}) => void };
                Object.keys(callSchema).forEach((method) => {
                    handlers[method] = ({ base, id }) => {
                        spec.rpc[method](base, (err, response) => {
                            if (err) {
                                this._responseProtocol.server.message.error({ base: err, id });
                            } else {
                                this._responseProtocol.server.message[method]({ base: response, id });
                            }
                        });
                    };
                });
                return handlers;
            })(this._protocolSchema['0']['client']),
        });

        this._responseProtocol.configure({
            message: ((resopnseSchema) => {
                const handlers = {} as { [method in keyof Schema['client']]:({ base, id }) => void };
                Object.keys(resopnseSchema).forEach((method) => {
                    handlers[method] = ({ base, id }) => {
                        this._callbacks[id](undefined, base);
                        delete this._callbacks[id];
                    };
                });
                return handlers;
            })(this._protocolSchema['1']['client']),
            ready: () => {
                if (spec && spec.ready) {
                    spec.ready();
                }
            },
            close: () => {
                if (spec && spec.close) {
                    spec.close();
                }
            },
        });

        this._errorProtocol.configure({
            message: {
                error: ({ message, id }) => {
                    console.log('Error:', message);
                    delete this._callbacks[id];
                },
            },
        });
    }
}
