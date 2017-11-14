import { MuClient } from 'mudb/client';
import { MuRPCProtocolSchema, MuRPCTable, MuRPCInterface, DefaultRPCSchema } from './rpc';

export class MuRPCRemoteServer<Schema extends MuRPCTable> {
    public readonly rpc:MuRPCInterface<Schema>['callAPI'];

    constructor(schema:Schema) {
      this.rpc = schema;
    }
}

export class MuRPCClient<Schema extends MuRPCProtocolSchema> {
    public readonly sessionId:string;
    public readonly client:MuClient;
    public readonly schema:Schema;

    public server:MuRPCRemoteServer<Schema['server']>;

    constructor (client:MuClient, schema:Schema) {
        this.client = client;
        this.schema = schema;
        this.server = new MuRPCRemoteServer(schema.server);
    }

    public configure(spec:{
        rpc:MuRPCInterface<Schema['client']>['handlerAPI'];
        ready?:() => void;
        close?:() => void;
    }) {
        this.client.protocol(DefaultRPCSchema).configure({
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
        })
    }
}
