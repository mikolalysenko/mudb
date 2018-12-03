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
    private _errorProtocol:MuClientProtocol<RPC.ErrorProtocolSchema>;

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
        this._errorProtocol = client.protocol(RPC.createErrorProtocolSchema(schema));

        this.server = new MuRPCRemoteServer(this._createRPC());
    }

    public configure (spec:{
        rpc:RPC.API<Schema['client']>['clientProcedure'];
        ready?:() => void;
        close?:() => void;
    }) {
        this._requestProtocol.configure({
            message: (() => {
                const handlers = {} as { [proc in keyof Schema['client']]:({id, base}) => void };
                Object.keys(this.schema.client).forEach((proc) => {
                    handlers[proc] = ({ id, base }) => {
                        spec.rpc[proc](base, (err, ret) => {
                            if (err) {
                                this._errorProtocol.server.message.error({
                                    id,
                                    message: err,
                                });
                            } else {
                                this._responseProtocol.server.message[proc]({
                                    id,
                                    base: this.schema.client[proc][1].clone(ret),
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
            close: () => {
                if (spec && spec.close) {
                    spec.close();
                }
            },
        });

        this._responseProtocol.configure({
            message: (() => {
                const handlers = {} as { [proc in keyof Schema['server']]:({ id, base }) => void };
                Object.keys(this.schema.server).forEach((proc) => {
                    handlers[proc] = ({ id, base }) => {
                        this._callbacks[id](this.schema.server[proc][1].clone(base));
                        delete this._callbacks[id];
                    };
                });
                return handlers;
            })(),
        });

        this._errorProtocol.configure({
            message: {
                error: ({ id, message }) => {
                    delete this._callbacks[id];
                    console.error(`mudb/rpc: ${message}`);
                },
            },
        });
    }
}
