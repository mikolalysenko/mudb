import { MuClient, MuClientProtocol } from 'mudb/client';
import { MuRPCProtocolSchema, MuRPCTable, MuRPCInterface, MuRPCProtocolSchemaInterface, createRPCProtocolSchemas } from './rpc';

export class MuRPCRemoteServer<Schema extends MuRPCTable> {
    public readonly rpc:MuRPCInterface<Schema>['callAPI'];
}

export class MuRPCClient<Schema extends MuRPCProtocolSchema> {
    public readonly sessionId:string;
    public readonly client:MuClient;
    public readonly schema:Schema;

    public server:MuRPCRemoteServer<Schema['server']>;

    private _protocolSchema:MuRPCProtocolSchemaInterface<Schema>;
    private _callProtocol:MuClientProtocol<MuRPCProtocolSchemaInterface<Schema>['0']>;
    private _responseProtocol:MuClientProtocol<MuRPCProtocolSchemaInterface<Schema>['1']>;

    constructor (client:MuClient, schema:Schema) {
        this.client = client;
        this.schema = schema;

        this._protocolSchema = createRPCProtocolSchemas(schema);
        this._callProtocol = client.protocol(this._protocolSchema['0']);
        this._responseProtocol = client.protocol(this._protocolSchema['1']);
    }

    public configure(spec:{
        rpc:MuRPCInterface<Schema['client']>['handlerAPI'];
        ready?:() => void;
        close?:() => void;
    }) {
    }
}
