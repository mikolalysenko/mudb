import { MuClient, MuClientProtocol } from '../client';
import { RPC } from './protocol';

export class MuRPCRemoteServer<T extends RPC.SchemaTable> {
    public readonly rpc:RPC.API<T>['caller'];

    constructor (rpc:RPC.API<T>['caller']) {
        this.rpc = rpc;
    }
}

const uniqueId:() => number =
    (() => {
        let next = 0;
        return () => next++;
    })();

export class MuRPCClient<Schema extends RPC.ProtocolSchema> {
    public readonly client:MuClient;
    public readonly sessionId:string;
    public readonly schema:Schema;
    public readonly server:MuRPCRemoteServer<Schema['server']>;

    private _requestProtocol:MuClientProtocol<RPC.TransposedProtocolSchema<Schema>[0]>;
    private _responseProtocol:MuClientProtocol<RPC.TransposedProtocolSchema<Schema>[1]>;
    private _errorProtocol:MuClientProtocol<typeof RPC.errorProtocolSchema>;

    private _callbacks:{ [id:string]:(ret) => void } = {};

    private _createRPC () {
        const rpc = {} as { [proc in keyof Schema['server']]:(arg, cb) => void };
        Object.keys(this.schema.server).forEach((proc) => {
            rpc[proc] = (arg, cb) => {
                const id = uniqueId();
                this._callbacks[id] = cb;
                this._requestProtocol.server.message[proc]({
                    id,
                    base: this.schema.server[proc][0].clone(arg),
                });
            };
        });
        return rpc;
    }

    constructor (client:MuClient, schema:Schema) {
        this.client = client;
        this.sessionId = client.sessionId;
        this.schema = schema;

        const transposedSchema = RPC.transpose(schema);
        this._requestProtocol = client.protocol(transposedSchema[0]);
        this._responseProtocol = client.protocol(transposedSchema[1]);
        this._errorProtocol = client.protocol(RPC.errorProtocolSchema);

        this.server = new MuRPCRemoteServer(this._createRPC());
    }

    public configure (spec:{
        rpc:RPC.API<Schema['client']>['clientProcedure'];
        ready?:() => void;
        close?:() => void;
    }) {
        this._requestProtocol.configure({
            message: (() => {
                const handlers = {} as { [method in keyof Schema['client']]:({base, id}) => void };
                Object.keys(this.schema.client).forEach((method) => {
                    handlers[method] = ({ base, id }) => {
                        spec.rpc[method](base, (err, response) => {
                            if (err) {
                                this._errorProtocol.server.message.error({ message: err, id });
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
                        this._callbacks[id](this.schema.server[method][1].clone(base));
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
                    delete this._callbacks[id];
                },
            },
        });
    }
}
