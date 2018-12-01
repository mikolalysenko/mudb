import { MuServer, MuServerProtocol } from '../server';
import { RPC } from './protocol';

export class MuRPCRemoteClient<T extends RPC.SchemaTable> {
    public readonly sessionId:string;
    public readonly rpc:RPC.API<T>['caller'];

    constructor (client, rpc:RPC.API<T>['caller']) {
        this.sessionId = client.sessionId;
        this.rpc = rpc;
    }
}

function findClient<T extends RPC.SchemaTable> (
    clients:MuRPCRemoteClient<T>[],
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

const uniqueId:() => number =
    (() => {
        let next = 0;
        return () => next++;
    })();

export class MuRPCServer<Schema extends RPC.ProtocolSchema> {
    public readonly server:MuServer;
    public readonly schema:Schema;
    public readonly clients:MuRPCRemoteClient<Schema['client']>[] = [];

    private _requestProtocol:MuServerProtocol<RPC.TransposedProtocolSchema<Schema>[0]>;
    private _responseProtocol:MuServerProtocol<RPC.TransposedProtocolSchema<Schema>[1]>;
    private _errorProtocol:MuServerProtocol<typeof RPC.errorProtocolSchema>;

    private _callbacks:{ [sessionId:string]:{ [id:string]:(ret) => void } } = {};

    private _createRPC (clientId) {
        const rpc = {} as { [method in keyof Schema]:(arg, cb) => void };
        Object.keys(this.schema.client).forEach((method) => {
            rpc[method] = (arg, cb) => {
                const id = uniqueId();
                this._callbacks[clientId][id] = cb;
                this._requestProtocol.clients[clientId].message[method]({
                    id,
                    base: this.schema.client[method][0].clone(arg),
                });
            };
        });
        return rpc;
    }

    constructor (server:MuServer, schema:Schema) {
        this.server = server;
        this.schema = schema;

        const transposedSchema = RPC.transpose(schema);
        this._requestProtocol = server.protocol(transposedSchema[0]);
        this._responseProtocol = server.protocol(transposedSchema[1]);
        this._errorProtocol = server.protocol(RPC.errorProtocolSchema);
    }

    public configure (spec:{
        rpc:RPC.API<Schema['server']>['serverProcedure'],
        ready?:() => void;
        connect?:(client:MuRPCRemoteClient<Schema['client']>) => void;
        disconnect?:(client:MuRPCRemoteClient<Schema['client']>) => void;
        close?:() => void;
    }) {
        this._requestProtocol.configure({
            message: (() => {
                const handlers = {} as { [method in keyof Schema['server']]:(client, { base, id }) => void };
                Object.keys(this.schema.server).forEach((method) => {
                    handlers[method] = (client_, { base, id }) => {
                        const clientIdx = findClient(this.clients, client_.sessionId);
                        const client = this.clients[clientIdx];

                        spec.rpc[method](
                            base,
                            (err, response) => {
                                if (err) {
                                    this._errorProtocol.clients[client.sessionId].message.error({ message: err, id });
                                } else {
                                    this._responseProtocol.clients[client.sessionId].message[method]({
                                        base: this.schema.server[method][1].clone(response),
                                        id,
                                    });
                                }
                            },
                            client,
                        );
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
                const client = new MuRPCRemoteClient(client_, this._createRPC(client_.sessionId));
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
            close: () => {
                if (spec && spec.close) {
                    spec.close();
                }
            },
        });

        this._responseProtocol.configure({
            message: (() => {
                const handlers = {} as { [method in keyof Schema['client']]:(client, { base, id }) => void };
                Object.keys(this.schema.client).forEach((method) => {
                    handlers[method] = (client, { base, id }) => {
                        const clientId = client.sessionId;
                        if (this._callbacks[clientId] && this._callbacks[clientId][id]) {
                            this._callbacks[clientId][id](this.schema.client[method][1].clone(base));
                            delete this._callbacks[clientId][id];
                        }
                    };
                });

                return handlers;
            })(),
        });

        this._errorProtocol.configure({
            message: {
                error: (client, { id, message }) => {
                    const clientId = client.sessionId;
                    if (this._callbacks[clientId]) {
                        delete this._callbacks[clientId][id];
                    }
                    console.error(`mudb/rpc: ${message}`);
                },
            },
        });
    }
}
