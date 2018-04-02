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

export class MuRPCClient<Schema extends MuRPCProtocolSchema> {
    public readonly sessionId:string;
    public readonly client:MuClient;
    public readonly schema:Schema;

    public server:MuRPCRemoteServer<Schema['server']>;

    private _protocolSchema:MuRPCProtocolSchemaTransformed<Schema>;
    private _callProtocol:MuClientProtocol<MuRPCProtocolSchemaTransformed<Schema>['0']>;
    private _responseProtocol:MuClientProtocol<MuRPCProtocolSchemaTransformed<Schema>['1']>;
    private _errorProtocol:MuClientProtocol<typeof MuRPCErrorProtocol>;

    private _callbacks:{[id:string]:(err, base) => void};

    constructor (client:MuClient, schema:Schema) {
        this.sessionId = client.sessionId;
        this.client = client;
        this.schema = schema;
        this._callbacks = {};

        this._protocolSchema = transformRPCProtocolSchema(schema);
        this._callProtocol = client.protocol(this._protocolSchema['0']);
        this._responseProtocol = client.protocol(this._protocolSchema['1']);
        this._errorProtocol = client.protocol(MuRPCErrorProtocol);

        this.server = new MuRPCRemoteServer(this.createServerPRC(this._callProtocol, schema.server));
    }

    private createServerPRC(callProtocol, serverSchema) {
        const result = {} as {[method in keyof Schema['server']]:(arg, next) => void};
        Object.keys(serverSchema).forEach((method) => {
            result[method] = (arg, next) => {
                const id = generateID();
                this._callbacks[id] = next;
                callProtocol.server.message[method]({'base': arg, id});
            };
        });
        return result;
    }

    public configure(spec:{
        rpc:MuRPCInterface<Schema['client']>['handlerAPI'];
        ready?:() => void;
        close?:() => void;
    }) {
        this._callProtocol.configure({
            message: ((schema, rpc, responseProtocol) => {
                const result = {} as {[method in keyof Schema['client']]:({base, id}) => void};
                Object.keys(schema).forEach((method) => {
                    result[method] = ({base, id}) => {
                        rpc[method](base, (err, response) => {
                            if (err) {
                                responseProtocol.server.message['error']({'base': err, id});
                            } else {
                                responseProtocol.server.message[method]({'base': response, id});
                            }
                        });
                    };
                });
                return result;
            })(this._protocolSchema['0']['client'], spec.rpc, this._responseProtocol),
        });

        this._responseProtocol.configure({
            message: ((schema, callbacks) => {
                const result = {} as {[method in keyof Schema['client']]:({base, id}) => void};
                Object.keys(schema).forEach((method) => {
                    result[method] = ({base, id}) => {
                        callbacks[id](undefined, base);
                        delete callbacks[id];
                    };
                });
                return result;
            })(this._protocolSchema['1']['client'], this._callbacks),
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
                    if (this._callbacks[id]) { delete this._callbacks[id]; }
                },
            },
        });
    }
}

function generateID() {
    const randomArray = new Uint16Array(1);
    crypto.getRandomValues(randomArray);
    return (Date.now() >>> 4) * 100000 + randomArray[0];
}
