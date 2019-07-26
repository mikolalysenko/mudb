import { MuClient, MuClientProtocol } from '../client';
import { MuSessionId } from '../socket/socket';
import { MuRPC } from './protocol';

const uniqueId = (() => {
    let next = 0;
    return () => next++;
})();

export class MuRPCRemoteServer<Table extends MuRPC.SchemaTable> {
    public readonly rpc:MuRPC.API<Table>['caller'];

    constructor (rpc:MuRPC.API<Table>['caller']) {
        this.rpc = rpc;
    }
}

export class MuRPCClient<Schema extends MuRPC.ProtocolSchema> {
    public readonly sessionId:MuSessionId;
    public readonly client:MuClient;
    public readonly schema:Schema;

    public readonly server:MuRPCRemoteServer<Schema['server']>;

    private _requestProtocol:MuClientProtocol<MuRPC.TransposedProtocolSchema<Schema>[0]>;
    private _responseProtocol:MuClientProtocol<MuRPC.TransposedProtocolSchema<Schema>[1]>;
    private _errorProtocol:MuClientProtocol<MuRPC.ErrorProtocolSchema>;

    private _callbacks:{ [id:string]:(ret) => void } = {};

    constructor (client:MuClient, schema:Schema) {
        this.sessionId = client.sessionId;
        this.client = client;
        this.schema = schema;

        const transposedSchema = MuRPC.transpose(schema);
        this._requestProtocol = client.protocol(transposedSchema[0]);
        this._responseProtocol = client.protocol(transposedSchema[1]);
        this._errorProtocol = client.protocol(MuRPC.createErrorProtocolSchema(schema));

        this.server = new MuRPCRemoteServer(this._createRPC());
    }

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

    public configure (spec:{
        rpc:MuRPC.API<Schema['client']>['clientProcedure'];
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
