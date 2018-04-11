import { MuServer, MuServerProtocol } from 'mudb/server';
import {
    MuRPCTable,
    MuRPCProtocolSchema,
    MuRPCProtocolSchemaUnfolded,
    MuRPCInterface,
    MuRPCErrorProtocolSchema,
    unfoldRPCProtocolSchema,
} from './rpc';

export class MuRemoteClientRPC<Schema extends MuRPCTable> {
    public readonly sessionId:string;
    public readonly rpc:MuRPCInterface<Schema>['callAPI'];

    constructor(client, rpc) {
        this.sessionId = client.sessionId;
        this.rpc = rpc;
    }
}

function findClient<RPCTable extends MuRPCTable> (
    clients:MuRemoteClientRPC<RPCTable>[],
    id:string,
) : number {
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

const uniqueNumber = (() => {
    let current = 0;
    return () => current++;
})();

export class MuServerRPC<Schema extends MuRPCProtocolSchema> {
    public readonly server:MuServer;
    public readonly schema:Schema;
    public readonly clients:MuRemoteClientRPC<Schema['client']>[] = [];

    private _callbacks:{ [sessionId:string]:{ [id:string]:(err, base) => void } } = {};

    private _callProtocol:MuServerProtocol<MuRPCProtocolSchemaUnfolded<Schema>['0']>;
    private _responseProtocol:MuServerProtocol<MuRPCProtocolSchemaUnfolded<Schema>['1']>;
    private _errorProtocol:MuServerProtocol<typeof MuRPCErrorProtocolSchema>;

    constructor (server:MuServer, schema:Schema) {
        this.server = server;
        this.schema = schema;

        const schemaUnfolded = unfoldRPCProtocolSchema(schema);
        this._callProtocol = server.protocol(schemaUnfolded['0']);
        this._responseProtocol = server.protocol(schemaUnfolded['1']);
        this._errorProtocol = server.protocol(MuRPCErrorProtocolSchema);
    }

    public configure(spec:{
        rpc:MuRPCInterface<Schema['server']>['handlerAPI'],
        ready?:() => void;
        connect?:(client:MuRemoteClientRPC<Schema['client']>) => void;
        disconnect?:(client:MuRemoteClientRPC<Schema['client']>) => void;
        close?:() => void;
    }) {
        this._callProtocol.configure({
            message: (() => {
                const handlers = {} as { [method in keyof Schema['server']]:(client, { base, id }) => void };
                Object.keys(this.schema.server).forEach((method) => {
                    handlers[method] = (client, { base, id }) => {
                        spec.rpc[method](base, (err, response) => {
                            if (err) {
                                this._responseProtocol.clients[client.sessionId].message.error({ base: err, id });
                            } else {
                                this._responseProtocol.clients[client.sessionId].message[method]({
                                    base: this.schema.server[method]['1'].clone(response),
                                    id,
                                });
                            }
                        });
                    };
                });
                return handlers;
            })(),
            ready: () => {
                if (spec && spec.ready) {
                    spec.ready();
                }
            },
            connect: (client_) => {
                const client = new MuRemoteClientRPC(client_, this._createClientRPC(client_.sessionId));
                this.clients.push(client);

                this._callbacks[client_.sessionId] = {};

                if (spec && spec.connect) {
                    spec.connect(client);
                }
            },
            disconnect: (client) => {
                const clientIdx = findClient(this.clients, client.sessionId);
                if (spec && spec.disconnect) {
                    spec.disconnect(this.clients[clientIdx]);
                }

                removeItem(this.clients, clientIdx);
                delete this._callbacks[client.sessionId];
            },
        });

        this._responseProtocol.configure({
            message: (() => {
                const handlers = {} as { [method in keyof Schema['client']]:(client, { base, id }) => void };
                Object.keys(this.schema.client).forEach((method) => {
                    handlers[method] = (client, { base, id }) => {
                        const clientId = client.sessionId;
                        if (this._callbacks[clientId] && this._callbacks[clientId][id]) {
                            this._callbacks[clientId][id](undefined, this.schema.client[method]['1'].clone(base));
                            delete this._callbacks[clientId][id];
                        }
                    };
                });
                return handlers;
            })(),
        });

        this._errorProtocol.configure({
            message: {
                error: (client, { message, id }) => {
                    const clientId = client.sessionId;
                    console.log(clientId, ': Error!', message);
                    if (this._callbacks[clientId] && this._callbacks[clientId][id]) {
                        delete this._callbacks[clientId][id];
                    }
                },
            },
        });
    }

    private _createClientRPC(clientId) {
        const rpc = {} as { [method in keyof Schema]:(arg, next) => void };
        Object.keys(this.schema.client).forEach((method) => {
            rpc[method] = (arg, next) => {
                const id = uniqueNumber();
                this._callbacks[clientId][id] = next;
                this._callProtocol.clients[clientId].message[method]({
                    base: this.schema.client[method]['0'].clone(arg),
                    id,
                });
            };
        });
        return rpc;
    }
}
