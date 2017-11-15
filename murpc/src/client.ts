import { MuClient, MuClientProtocol } from 'mudb/client';
import { MuRPCProtocolSchema, MuRPCTable, MuRPCInterface, DefaultRPCSchema } from './rpc';

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

    constructor (client:MuClient, schema:Schema) {
        this.client = client;
        this.schema = schema;
        this._protocol = client.protocol(DefaultRPCSchema);
        this.server = new MuRPCRemoteServer(this.createSchemaDispatch(this._protocol, schema.server));
    }

    private createSchemaDispatch(protocol, schema) {
        const result = {};
        Object.keys(schema).forEach((methodName) => {
            result[methodName] = (arg, next) => {
                protocol.server.message.rpc(methodName, arg, next);
            };
        });
        return result;
    }

    public configure(spec:{
        rpc:MuRPCInterface<Schema['client']>['handlerAPI'];
        ready?:() => void;
        close?:() => void;
    }) {
        this._protocol.configure({
            message: {
                rpc: (client, method) => {
                    // FIXME:
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
