import { MuServer, MuServerProtocol } from '../server';
import {
    MuRPCTable,
    MuRPCProtocolSchema,
    MuRPCProtocolSchemaUnfolded,
    MuRPCInterface,
    MuRPCErrorProtocolSchema,
    unfoldRPCProtocolSchema,
} from './rpc';

export class MuRPCRemoteClient<RPCTable extends MuRPCTable> {
    public readonly sessionId:string;
    public readonly rpc:MuRPCInterface<RPCTable>['callerAPI'];

    constructor (client, rpc) {
        this.sessionId = client.sessionId;
        this.rpc = rpc;
    }
}

function findClient<RPCTable extends MuRPCTable> (
    clients:MuRPCRemoteClient<RPCTable>[],
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
    let next = 0;
    return () => next++;
})();

export class MuRPCServer<ProtocolSchema extends MuRPCProtocolSchema> {
    public readonly server:MuServer;
    public readonly schema:ProtocolSchema;
    public readonly clients:MuRPCRemoteClient<ProtocolSchema['client']>[] = [];

    private _callProtocol:MuServerProtocol<MuRPCProtocolSchemaUnfolded<ProtocolSchema>[0]>;
    private _responseProtocol:MuServerProtocol<MuRPCProtocolSchemaUnfolded<ProtocolSchema>[1]>;
    private _errorProtocol:MuServerProtocol<typeof MuRPCErrorProtocolSchema>;

    private _callbacks:{ [sessionId:string]:{ [id:string]:(base) => void } } = {};

    private _createRPCToClient (clientId) {
        const rpc = {} as { [method in keyof ProtocolSchema]:(arg, next) => void };
        Object.keys(this.schema.client).forEach((method) => {
            rpc[method] = (arg, next) => {
                const id = uniqueNumber();
                this._callbacks[clientId][id] = next;
                this._callProtocol.clients[clientId].message[method]({
                    base: this.schema.client[method][0].clone(arg),
                    id,
                });
            };
        });
        return rpc;
    }

    constructor (server:MuServer, schema:ProtocolSchema) {
        this.server = server;
        this.schema = schema;

        const schemaUnfolded = unfoldRPCProtocolSchema(schema);
        this._callProtocol = server.protocol(schemaUnfolded[0]);
        this._responseProtocol = server.protocol(schemaUnfolded[1]);
        this._errorProtocol = server.protocol(MuRPCErrorProtocolSchema);
    }

    public configure (spec:{
        rpc:MuRPCInterface<ProtocolSchema['server']>['serverHandlerAPI'],
        ready?:() => void;
        connect?:(client:MuRPCRemoteClient<ProtocolSchema['client']>) => void;
        disconnect?:(client:MuRPCRemoteClient<ProtocolSchema['client']>) => void;
        close?:() => void;
    }) {
        this._callProtocol.configure({
            message: (() => {
                const handlers = {} as { [method in keyof ProtocolSchema['server']]:(client, { base, id }) => void };
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
                const client = new MuRPCRemoteClient(client_, this._createRPCToClient(client_.sessionId));
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
                const handlers = {} as { [method in keyof ProtocolSchema['client']]:(client, { base, id }) => void };
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
                error: (client, { message, id }) => {
                    const clientId = client.sessionId;
                    if (this._callbacks[clientId]) {
                        delete this._callbacks[clientId][id];
                    }
                },
            },
        });
    }
}
