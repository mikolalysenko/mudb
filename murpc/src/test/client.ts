import { MuClient, MuClientProtocol } from 'mudb/client';
import { MuRPCProtocolSchema, MuRPCTable, MuRPCInterface, MuRPCProtocolSchemaInterface, createRPCProtocolSchemas, generateId } from './rpc';

export class MuRPCRemoteServer<Schema extends MuRPCTable> {
    public readonly rpc:MuRPCInterface<Schema>['callAPI'];

    constructor(schema:MuRPCInterface<Schema>['callAPI']) {
        this.rpc = schema;
    }
}

export class MuRPCClient<Schema extends MuRPCProtocolSchema> {
    public readonly sessionId:string;
    public readonly client:MuClient;
    public readonly schema:Schema;

    public server:MuRPCRemoteServer<Schema['server']>;
    private _protocol:MuClientProtocol<typeof DefaultRPCSchema>;

    private callbacks:{[id:string]:(err, response) => void};

    private _protocolSchema:MuRPCProtocolSchemaInterface<Schema>;
    private _callProtocol:MuClientProtocol<MuRPCProtocolSchemaInterface<Schema>['0']>;
    private _responseProtocol:MuClientProtocol<MuRPCProtocolSchemaInterface<Schema>['1']>;

    constructor (client:MuClient, schema:Schema) {
        this.client = client;
        this.schema = schema;
        this._protocol = client.protocol(DefaultRPCSchema);
        this.server = new MuRPCRemoteServer(this.createSchemaDispatch(this._protocol, schema.server));
        this.callbacks = {};
    }

    private createSchemaDispatch(protocol, schema) {
        const result = {};
        Object.keys(schema).forEach((methodName) => {
            result[methodName] = (arg, next) => {
                const id = generateId();
                this.callbacks[id] = next;
                protocol.server.message.call({id, methodName, arg});
            };
        });
        return result;
        this._protocolSchema = createRPCProtocolSchemas(schema);
        this._callProtocol = client.protocol(this._protocolSchema['0']);
        this._responseProtocol = client.protocol(this._protocolSchema['1']);
    }

    public configure(spec:{
        rpc:MuRPCInterface<Schema['client']>['handlerAPI'];
        ready?:() => void;
        close?:() => void;
    }) {
        this._protocol.configure({
            message: {
                call: ({id, methodName, arg}) => {
                    //FIXME:
                },
                response: ({id, err, response}) => {
                    this.callbacks[id](err, response);
                },
            },
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
