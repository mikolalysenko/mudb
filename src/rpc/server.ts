import { MuServer, MuServerProtocol } from '../server';
import { MuSessionId } from '../socket/socket';
import { MuRPC } from './protocol';

const uniqueId = (() => {
    let next = 0;
    return () => next++;
})();

function findClient<T extends MuRPC.SchemaTable> (
    clients:MuRPCRemoteClient<T>[],
    sessionId:MuSessionId,
) : number {
    for (let i = 0; i < clients.length; ++i) {
        if (clients[i].sessionId === sessionId) {
            return i;
        }
    }
    return -1;
}

function removeItem (array:any[], index:number) {
    array[index] = array[array.length - 1];
    array.pop();
}

export class MuRPCRemoteClient<Table extends MuRPC.SchemaTable> {
    public readonly sessionId:MuSessionId;
    public readonly rpc:MuRPC.API<Table>['caller'];

    constructor (sessionId:MuSessionId, rpc:MuRPC.API<Table>['caller']) {
        this.sessionId = sessionId;
        this.rpc = rpc;
    }
}

export class MuRPCServer<Schema extends MuRPC.ProtocolSchema> {
    public readonly server:MuServer;
    public readonly schema:Schema;

    public readonly clients:MuRPCRemoteClient<Schema['client']>[] = [];

    private _requestProtocol:MuServerProtocol<MuRPC.TransposedProtocolSchema<Schema>[0]>;
    private _responseProtocol:MuServerProtocol<MuRPC.TransposedProtocolSchema<Schema>[1]>;
    private _errorProtocol:MuServerProtocol<MuRPC.ErrorProtocolSchema>;

    private _callbacks:{ [sessionId:string]:{ [id:string]:(ret) => void } } = {};

    constructor (server:MuServer, schema:Schema) {
        this.server = server;
        this.schema = schema;

        const transposedSchema = MuRPC.transpose(schema);
        this._requestProtocol = server.protocol(transposedSchema[0]);
        this._responseProtocol = server.protocol(transposedSchema[1]);
        this._errorProtocol = server.protocol(MuRPC.createErrorProtocolSchema(schema));
    }

    private _createRPC (sessionId:MuSessionId) {
        const rpc = {};
        Object.keys(this.schema.client).forEach((proc) => {
            rpc[proc] = (arg, cb) => {
                const id = uniqueId();
                this._callbacks[sessionId][id] = cb;
                this._requestProtocol.clients[sessionId].message[proc]({
                    id,
                    base: this.schema.client[proc][0].clone(arg),
                });
            };
        });
        return <{ [proc in keyof Schema['client']]:(arg, cb) => void }>rpc;
    }

    public configure (spec:{
        rpc:MuRPC.API<Schema['server']>['serverProcedure'],
        ready?:() => void;
        connect?:(client:MuRPCRemoteClient<Schema['client']>) => void;
        disconnect?:(client:MuRPCRemoteClient<Schema['client']>) => void;
        close?:() => void;
    }) {
        this._requestProtocol.configure({
            message: (() => {
                const handlers = {};
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
                return <{ [proc in keyof Schema['server']]:(client, { id, base }) => void }>handlers;
            })(),
            ready: () => {
                if (spec && spec.ready) {
                    spec.ready();
                }
            },
            connect: (client_) => {
                const sessionId = client_.sessionId;
                const client = new MuRPCRemoteClient(sessionId, this._createRPC(sessionId));

                if (spec && spec.connect) {
                    spec.connect(client);
                }

                this.clients.push(client);
                this._callbacks[sessionId] = {};
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
                const handlers = {};
                Object.keys(this.schema.client).forEach((proc) => {
                    handlers[proc] = (client, { base, id }) => {
                        const clientCallbacks = this._callbacks[client.sessionId];
                        if (clientCallbacks && clientCallbacks[id]) {
                            clientCallbacks[id](this.schema.client[proc][1].clone(base));
                            delete clientCallbacks[id];
                        }
                    };
                });

                return <{ [proc in keyof Schema['client']]:(client, { base, id }) => void }>handlers;
            })(),
        });

        this._errorProtocol.configure({
            message: {
                error: (client, { id, message }) => {
                    const clientCallbacks = this._callbacks[client.sessionId];
                    if (clientCallbacks) {
                        delete clientCallbacks[id];
                    }
                    console.error(`mudb/rpc: ${message}`);
                },
            },
        });
    }
}
