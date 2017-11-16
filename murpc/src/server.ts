import { MuServer, MuServerProtocol, MuRemoteClientProtocol } from 'mudb/server';
import { MuRPCTable, MuRPCProtocolSchema, MuRPCInterface, MuRPCProtocolSchemaInterface, createRPCProtocolSchemas, generateId } from './rpc';

export class MuRemoteRPCClient<Schema extends MuRPCTable> {
    public readonly sessionId:string;
    public readonly rpc:MuRPCInterface<Schema>['callAPI'];
    private _client:MuRemoteClientProtocol<typeof DefaultRPCSchema['client']>;

    constructor(client:MuRemoteClientProtocol<typeof DefaultRPCSchema['client']>, schema:MuRPCInterface<Schema>['callAPI']) {
        this.sessionId = client.sessionId;
        this._client = client;

        this.rpc = schema;
    }
}

export class MuRPCServer<Schema extends MuRPCProtocolSchema> {
    public readonly server:MuServer;
    public readonly schema:Schema;
    public readonly clients:MuRemoteRPCClient<Schema['client']>[] = [];

    private _protocol:MuServerProtocol<typeof DefaultRPCSchema>;
    private _protocolSchema:MuRPCProtocolSchemaInterface<Schema>;
    private _callProtocol:MuServerProtocol<MuRPCProtocolSchemaInterface<Schema>['0']>;
    private _responseProtocol:MuServerProtocol<MuRPCProtocolSchemaInterface<Schema>['1']>;

    constructor (server:MuServer, schema:Schema) {
        this.server = server;
        this.schema = schema;
        this._protocol = server.protocol(DefaultRPCSchema);
    }

    private createDispatch(client, schema) { //FIXME:
        const result = {};
        const methodNames = Object.keys(schema).sort();
        methodNames.forEach((methodName, messageId) => {
            result[methodName] = function(arg, next?:() => void) {
                const d = schema.diff(schema.identity, arg);
                const str = JSON.stringify(d);
                client.send(str);
            };
        });
        return result;
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
        this._protocol.configure({
            message: {
                call: (client, {id, methodName, arg}) => {
                    spec.rpc[methodName](arg, (err, response) => {
                        this._protocol.broadcast.response({id, err, response});
                    });
                },
                response: (client, {id, err, response}) => {
                    //FIXME:
                },
            },
            ready: () => {
                if (spec && spec.ready) {
                    spec.ready();
                }
            },
            connect: (client_) => {
                const client = new MuRemoteRPCClient(client_, this.createDispatch(client_, this.schema.client));
                this.clients.push(client);
                if (spec && spec.connect) {
                    spec.connect(client);
                }
            },
            disconnect: (client_) => {
                const clientId = findClient(this.clients, client_.sessionId);
                if (spec && spec.disconnect) {
                    spec.disconnect(this.clients[clientId]);
                }
                const client = this.clients[clientId];
                removeItem(this.clients, clientId);
            },
        });
    }
}

function findClient<ClientType extends MuRemoteRPCClient<MuRPCTable>>(clients:ClientType[], id:string) {
    for (let i = 0; i < clients.length; ++i) {
        if (clients[i].sessionId === id) {
            return i;
        }
    }
    return -1;
}

function removeItem (array:any[], index:number) {
    array[index] = array[array.length - 1];
    array.pop();
}
