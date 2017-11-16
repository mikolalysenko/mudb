import { MuServer, MuServerProtocol, MuRemoteClientProtocol } from 'mudb/server';
import { MuRPCTable, MuRPCProtocolSchema, MuRPCInterface, MuRPCProtocolSchemaInterface, createRPCProtocolSchemas } from './rpc';

export class MuRemoteRPCClient<Schema extends MuRPCTable> {
    public readonly sessionId:string;

    public readonly rpc:MuRPCInterface<Schema>['callAPI'];
}

export class MuRPCServer<Schema extends MuRPCProtocolSchema> {
    public readonly server:MuServer;
    public readonly schema:Schema;

    public readonly clients:MuRemoteRPCClient<Schema['client']>[] = [];

    private _protocolSchema:MuRPCProtocolSchemaInterface<Schema>;
    private _callProtocol:MuServerProtocol<MuRPCProtocolSchemaInterface<Schema>['0']>;
    private _responseProtocol:MuServerProtocol<MuRPCProtocolSchemaInterface<Schema>['1']>;

    constructor (server:MuServer, schema:Schema) {
        this.server = server;
        this.schema = schema;

        this._protocolSchema = createRPCProtocolSchemas(schema);
        this._callProtocol = server.protocol(this._protocolSchema[0]);
        this._responseProtocol = server.protocol(this._protocolSchema[1]);
    }

    public configure(spec:{
        rpc:MuRPCInterface<Schema['server']>['handlerAPI'],
        ready?:() => void;
        connect?:(client:MuRemoteRPCClient<Schema['client']>) => void;
        disconnect?:(client:MuRemoteRPCClient<Schema['client']>) => void;
        close?:() => void;
    }) {
    }
}
