import { MuClient, MuClientProtocol } from 'mudb/client';
import { MuRPCProtocolSchema, MuRPCTable, MuRPCInterface, MuRPCProtocolSchemaInterface, createRPCProtocolSchemas, generateID } from './rpc';

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

    private _protocolSchema:MuRPCProtocolSchemaInterface<Schema>;
    private _callProtocol:MuClientProtocol<MuRPCProtocolSchemaInterface<Schema>['0']>;
    private _responseProtocol:MuClientProtocol<MuRPCProtocolSchemaInterface<Schema>['1']>;

    private _callbacks:{[id:string]:(base) => void};

    constructor (client:MuClient, schema:Schema) {
        this.client = client;
        this.schema = schema;
        this._callbacks = {};

        this._protocolSchema = createRPCProtocolSchemas(schema);
        this._callProtocol = client.protocol(this._protocolSchema['0']);
        this._responseProtocol = client.protocol(this._protocolSchema['1']);

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
                            const response_base = this.schema.client[method][1].clone(response);
                            responseProtocol.server.message[method]({'base': response_base, id});
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
                        callbacks[id](base);
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
    }
}
