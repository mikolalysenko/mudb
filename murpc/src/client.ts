import { MuClient, MuClientProtocol } from 'mudb/client';
import {
    MuRPCProtocolSchema,
    MuRPCErrorProtocolSchema,
    MuRPCTable,
    MuRPCInterface,
    MuRPCProtocolSchemaUnfolded,
    unfoldRPCProtocolSchema,
} from './rpc';

export class MuRemoteServerRPC<Schema extends MuRPCTable> {
    public readonly rpc:MuRPCInterface<Schema>['callerAPI'];

    constructor(rpc:MuRPCInterface<Schema>['callerAPI']) {
        this.rpc = rpc;
    }
}

const uniqueNumber = (() => {
    let next = 0;
    return () => next++;
})();

export class MuRPCClient<Schema extends MuRPCProtocolSchema> {
    public readonly sessionId:string;
    public readonly client:MuClient;
    public readonly schema:Schema;

    public server:MuRemoteServerRPC<Schema['server']>;

    private _callProtocol:MuClientProtocol<MuRPCProtocolSchemaUnfolded<Schema>[0]>;
    private _responseProtocol:MuClientProtocol<MuRPCProtocolSchemaUnfolded<Schema>[1]>;
    private _errorProtocol:MuClientProtocol<typeof MuRPCErrorProtocolSchema>;

    private _callbacks:{ [id:string]:(err, base) => void } = {};

    constructor (client:MuClient, schema:Schema) {
        this.sessionId = client.sessionId;
        this.client = client;
        this.schema = schema;

        const schemaUnfolded = unfoldRPCProtocolSchema(schema);
        this._callProtocol = client.protocol(schemaUnfolded[0]);
        this._responseProtocol = client.protocol(schemaUnfolded[1]);
        this._errorProtocol = client.protocol(MuRPCErrorProtocolSchema);

        this.server = new MuRemoteServerRPC(this._createServerPRC());
    }

    private _createServerPRC() {
        const rpc = {} as { [method in keyof Schema['server']]:(arg, next) => void };
        Object.keys(this.schema.server).forEach((method) => {
            rpc[method] = (arg, next) => {
                const id = uniqueNumber();
                this._callbacks[id] = next;
                this._callProtocol.server.message[method]({
                    base: this.schema.server[method][0].clone(arg),
                    id,
                });
            };
        });
        return rpc;
    }

    public configure(spec:{
        rpc:MuRPCInterface<Schema['client']>['handlerAPI'];
        ready?:() => void;
        close?:() => void;
    }) {
        this._callProtocol.configure({
            message: (() => {
                const handlers = {} as { [method in keyof Schema['client']]:({base, id}) => void };
                Object.keys(this.schema.client).forEach((method) => {
                    handlers[method] = ({ base, id }) => {
                        spec.rpc[method](base, (err, response) => {
                            if (err) {
                                this._responseProtocol.server.message.error({ base: err, id });
                            } else {
                                this._responseProtocol.server.message[method]({
                                    base: this.schema.client[method][1].clone(response),
                                    id,
                                });
                            }
                        });
                    };
                });
                return handlers;
            })(),
        });

        this._responseProtocol.configure({
            message: (() => {
                const handlers = {} as { [method in keyof Schema['server']]:({ base, id }) => void };
                Object.keys(this.schema.server).forEach((method) => {
                    handlers[method] = ({ base, id }) => {
                        this._callbacks[id](undefined, this.schema.server[method][1].clone(base));
                        delete this._callbacks[id];
                    };
                });
                return handlers;
            })(),
            ready: () => {
                if (spec && spec.ready) {
                    spec.ready();
                }
            },
            close: () => {
                if (spec && spec.close) {
                    spec.close();
                }
            },
        });

        this._errorProtocol.configure({
            message: {
                error: ({ message, id }) => {
                    console.log('Error:', message);
                    delete this._callbacks[id];
                },
            },
        });
    }
}
