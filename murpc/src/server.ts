import { MuServer, MuServerProtocol, MuRemoteClientProtocol } from 'mudb/server';
import { MuRPCTable, MuRPCProtocolSchema, MuRPCInterface, DefaultRPCSchema } from './rpc';

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

    constructor (server:MuServer, schema:Schema) {
        this.server = server;
        this.schema = schema;
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
    }

    public configure(spec:{
        rpc:MuRPCInterface<Schema['server']>['handlerAPI'],
        ready?:() => void;
        connect?:(client:MuRemoteRPCClient<Schema['client']>) => void;
        disconnect?:(client:MuRemoteRPCClient<Schema['client']>) => void;
        close?:() => void;
    }) {
        this.server.protocol(DefaultRPCSchema).configure({
            message: {
                rpc: (client, {methodName, args, next}) => {
                    spec.rpc[methodName](args, (err, response) => next);
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
