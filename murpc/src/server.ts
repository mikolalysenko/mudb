import { MuServer, MuServerProtocol, MuRemoteClientProtocol } from 'mudb/server';
import { MuRPCTable, MuRPCProtocolSchema, MuRPCInterface, MuRPCProtocolSchemaInterface, createRPCProtocolSchemas, generateID } from './rpc';
import { MuRPCClient } from './client';

export class MuRemoteRPCClient<Schema extends MuRPCTable> {
    public readonly sessionId:string;
    public readonly rpc:MuRPCInterface<Schema>['callAPI'];

    constructor(client, callProtocol, clientSchema, callbacks) {
        this.sessionId = client.sessionId;
        this.rpc = {} as {[method in keyof Schema]:(arg, next) => void};

        Object.keys(clientSchema).forEach((method) => {
            this.rpc[method] = (arg, next) => {
                const id = generateID();
                callbacks[id] = next;
                callProtocol.clients[this.sessionId].message[method]({'base':clientSchema[method][0].clone(arg), id});
            };
        });
    }
}

export class MuRPCServer<Schema extends MuRPCProtocolSchema> {
    public readonly server:MuServer;
    public readonly schema:Schema;

    public readonly clients:MuRemoteRPCClient<Schema['client']>[] = [];
    private _callbacks:{[id:string]:(base) => void};

    private _protocolSchema:MuRPCProtocolSchemaInterface<Schema>;
    private _callProtocol:MuServerProtocol<MuRPCProtocolSchemaInterface<Schema>['0']>;
    private _responseProtocol:MuServerProtocol<MuRPCProtocolSchemaInterface<Schema>['1']>;

    constructor (server:MuServer, schema:Schema) {
        this.server = server;
        this.schema = schema;
        this._callbacks = {};

        this._protocolSchema = createRPCProtocolSchemas(schema);
        this._callProtocol = server.protocol(this._protocolSchema['0']);
        this._responseProtocol = server.protocol(this._protocolSchema['1']);
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
                            const response_base = this.schema.server[method][1].clone(response);
                            responseProtocol.clients[client_.sessionId].message[method]({'base': response_base, id});
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
                const client = new MuRemoteRPCClient(client_, this._callProtocol, this.schema.client, this._callbacks);
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

        this._responseProtocol.configure({
            message: ((schema, callbacks) => {
                const result = {} as {[method in keyof Schema['client']]:(client_, {base, id}) => void};
                Object.keys(schema).forEach((method) => {
                    result[method] = (client_, {base, id}) => {
                        callbacks[id](this.schema.client[method][1].clone(base));
                    };
                });
                return result;
            })(this._protocolSchema['1']['client'], this._callbacks),
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
