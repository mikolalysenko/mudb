import { MuServer, MuServerProtocol, MuRemoteClientProtocol } from 'mudb/server';
import { MuRPCTable, MuRPCProtocolSchema, MuRPCInterface, MuRPCProtocolSchemaInterface, createRPCProtocolSchemas, MuRPCErrorProtocol } from './rpc';
import { MuRPCClient } from './client';
import { callbackify } from 'util';
const crypto = require('crypto');

export class MuRemoteRPCClient<Schema extends MuRPCTable> {
    public readonly sessionId:string;
    public readonly rpc:MuRPCInterface<Schema>['callAPI'];

    constructor(client, rpc) {
        this.sessionId = client.sessionId;
        this.rpc = rpc;
    }
}

export class MuRPCServer<Schema extends MuRPCProtocolSchema> {
    public readonly server:MuServer;
    public readonly schema:Schema;

    public readonly clients:MuRemoteRPCClient<Schema['client']>[] = [];
    private _callbacks:{[sessionId:string]:{[id:string]:(base) => void}};

    private _protocolSchema:MuRPCProtocolSchemaInterface<Schema>;
    private _callProtocol:MuServerProtocol<MuRPCProtocolSchemaInterface<Schema>['0']>;
    private _responseProtocol:MuServerProtocol<MuRPCProtocolSchemaInterface<Schema>['1']>;
    private _errorProtocol:MuServerProtocol<typeof MuRPCErrorProtocol>;

    constructor (server:MuServer, schema:Schema) {
        this.server = server;
        this.schema = schema;
        this._callbacks = {};

        this._protocolSchema = createRPCProtocolSchemas(schema);
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
            message: ((schema, rpc, responseProtocol) => {
                const result = {} as {[method in keyof Schema['server']]:(client_, {base, id}) => void};
                Object.keys(schema).forEach((method) => {
                    result[method] = (client_, {base, id}) => {
                        rpc[method](base, (err, response) => {
                            if (err) {
                                responseProtocol.clients[client_.sessionId].message['error']({'base': err, id});
                            } else {
                                const response_base = this.schema.server[method][1].clone(response);
                                responseProtocol.clients[client_.sessionId].message[method]({'base': response_base, id});
                            }
                        });
                    };
                });
                return result;
            })(this._protocolSchema['0']['server'], spec.rpc, this._responseProtocol),
            ready: () => {
                if (spec && spec.ready) {
                    spec.ready();
                }
            },
            connect: (client_) => {
                const client = new MuRemoteRPCClient(client_, this.createClientRPC(client_.sessionId));
                this.clients.push(client);
                this._callbacks[client_.sessionId] = {};
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
                delete this._callbacks[client_.sessionId];
            },
        });

        this._responseProtocol.configure({
            message: ((schema, callbacks) => {
                const result = {} as {[method in keyof Schema['client']]:(client_, {base, id}) => void};
                Object.keys(schema).forEach((method) => {
                    result[method] = (client_, {base, id}) => {
                        const clientId = client_.sessionId;
                        if (callbacks[clientId] && callbacks[clientId][id]) {
                            callbacks[clientId][id](this.schema.client[method][1].clone(base));
                            delete callbacks[clientId][id];
                        }
                    };
                });
                return result;
            })(this._protocolSchema['1']['client'], this._callbacks),
        });

        this._errorProtocol.configure({
            message: {
                error: (client, {message, id}) => {
                    const clientId = client.sessionId;
                    console.log(clientId, ': Error!', message);
                    if (this._callbacks[clientId] && this._callbacks[clientId][id]) {
                        delete this._callbacks[clientId][id];
                    }
                },
            },
        });
    }

    private createClientRPC(clientId) {
        const rpc = {} as {[method in keyof Schema]:(arg, next) => void};
        Object.keys(this.schema.client).forEach((method) => {
            rpc[method] = (arg, next) => {
                const id = generateID();
                this._callbacks[clientId][id] = next;
                this._callProtocol.clients[clientId].message[method]({'base':this.schema.client[method][0].clone(arg), id});
            };
        });
        return rpc;
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

function generateID() {
    const buf = crypto.randomBytes(2);
    return (Date.now() >>> 4) * 100000 + parseInt(buf.toString('hex'), 16);
}
