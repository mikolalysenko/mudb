import { MuServer, MuServerProtocol } from 'mudb/server';
import {
    MuRPCTable,
    MuRPCProtocolSchema,
    MuRPCProtocolSchemaTransformed,
    MuRPCInterface,
    MuRPCErrorProtocol,
    transformRPCProtocolSchema,
} from './rpc';

export class MuRemoteRPCClient<Schema extends MuRPCTable> {
    public readonly sessionId:string;
    public readonly rpc:MuRPCInterface<Schema>['callAPI'];

    constructor(client, rpc) {
        this.sessionId = client.sessionId;
        this.rpc = rpc;
    }
}

function findClient<RPCTable extends MuRPCTable> (
    clients:MuRemoteRPCClient<RPCTable>[],
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

export class MuRPCServer<Schema extends MuRPCProtocolSchema> {
    public readonly server:MuServer;
    public readonly schema:Schema;
    public readonly clients:MuRemoteRPCClient<Schema['client']>[] = [];

    private _callbacks:{ [sessionId:string]:{ [id:string]:(err, base) => void } } = {};

    private _protocolSchema:MuRPCProtocolSchemaTransformed<Schema>;
    private _callProtocol:MuServerProtocol<MuRPCProtocolSchemaTransformed<Schema>['0']>;
    private _responseProtocol:MuServerProtocol<MuRPCProtocolSchemaTransformed<Schema>['1']>;
    private _errorProtocol:MuServerProtocol<typeof MuRPCErrorProtocol>;

    constructor (server:MuServer, schema:Schema) {
        this.server = server;
        this.schema = schema;

        this._protocolSchema = transformRPCProtocolSchema(schema);
        this._callProtocol = server.protocol(this._protocolSchema['0']);
        this._responseProtocol = server.protocol(this._protocolSchema['1']);
        this._errorProtocol = server.protocol(MuRPCErrorProtocol);
    }

    public configure(spec:{
        rpc:MuRPCInterface<Schema['server']>['handlerAPI'],
        ready?:() => void;
        connect?:(client:MuRemoteRPCClient<Schema['client']>) => void;
        disconnect?:(client:MuRemoteRPCClient<Schema['client']>) => void;
        close?:() => void;
    }) {
        this._callProtocol.configure({
            message: ((callSchema) => {
                const handlers = {} as { [method in keyof Schema['server']]:(client, { base, id }) => void };
                Object.keys(callSchema).forEach((method) => {
                    handlers[method] = (client, { base, id }) => {
                        spec.rpc[method](base, (err, response) => {
                            if (err) {
                                this._responseProtocol.clients[client.sessionId].message.error({ base: err, id });
                            } else {
                                const responseBase = this.schema.server[method]['1'].clone(response);
                                this._responseProtocol.clients[client.sessionId].message[method]({ base: responseBase, id });
                            }
                        });
                    };
                });
                return handlers;
            })(this._protocolSchema['0']['server']),
            ready: () => {
                if (spec && spec.ready) {
                    spec.ready();
                }
            },
            connect: (client_) => {
                const client = new MuRemoteRPCClient(client_, this._createClientRPC(client_.sessionId));
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
            message: ((responseSchema) => {
                const handlers = {} as { [method in keyof Schema['client']]:(client, { base, id }) => void };
                Object.keys(responseSchema).forEach((method) => {
                    handlers[method] = (client, { base, id }) => {
                        const clientId = client.sessionId;
                        if (this._callbacks[clientId] && this._callbacks[clientId][id]) {
                            this._callbacks[clientId][id](undefined, this.schema.client[method]['1'].clone(base));
                            delete this._callbacks[clientId][id];
                        }
                    };
                });
                return handlers;
            })(this._protocolSchema['1']['client']),
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
                this._callProtocol.clients[clientId].message[method]({ base: this.schema.client[method]['0'].clone(arg), id });
            };
        });
        return rpc;
    }
}
