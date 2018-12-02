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
        const rpc = {} as { [proc in keyof Schema['client']]:(arg, cb) => void };
        Object.keys(this.schema.client).forEach((proc) => {
            rpc[proc] = (arg, cb) => {
                const id = uniqueId();
                this._callbacks[clientId][id] = cb;
                this._requestProtocol.clients[clientId].message[proc]({
                    id,
                    base: this.schema.client[proc][0].clone(arg),
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
                const handlers = {} as { [proc in keyof Schema['server']]:(client, { id, base }) => void };
                Object.keys(this.schema.server).forEach((proc) => {
                    handlers[proc] = (client_, { id, base }) => {
                        const idx = findClient(this.clients, client_.sessionId);
                        if (idx < 0) {
                            return;
                        }

                        const client = this.clients[idx];
                        spec.rpc[proc](
                            base,
                            (err, ret) => {
                                if (err) {
                                    this._errorProtocol.clients[client.sessionId].message.error({
                                        id,
                                        message: err,
                                    });
                                } else {
                                    this._responseProtocol.clients[client.sessionId].message[proc]({
                                        id,
                                        base: this.schema.server[proc][1].clone(ret),
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
                const idx = findClient(this.clients, client.sessionId);
                if (idx < 0) {
                    console.error(`mudb/rpc: cannot find disconnecting client ${client.sessionId}`);
                    return;
                }

                if (spec && spec.disconnect) {
                    spec.disconnect(this.clients[idx]);
                }

                removeItem(this.clients, idx);
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
                const handlers = {} as { [proc in keyof Schema['client']]:(client, { base, id }) => void };
                Object.keys(this.schema.client).forEach((proc) => {
                    handlers[proc] = (client, { base, id }) => {
                        const clientId = client.sessionId;
                        if (this._callbacks[clientId] && this._callbacks[clientId][id]) {
                            this._callbacks[clientId][id](this.schema.client[proc][1].clone(base));
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
