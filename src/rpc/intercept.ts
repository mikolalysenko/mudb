import { MuLogger } from '../logger';
import { MuRPCClient } from './client';
import { MuRPCClientTransport, MuRPCConnection, MuRPCProtocol, MuRPCSchemas, MuRPCServerTransport } from './protocol';
import { MuRPCServer } from './server';

// Helper class to intercept RPC methods between a client and server
export class MuRPCIntercept<Protocol extends MuRPCProtocol<any>, Connection extends MuRPCConnection> {
    public protocol:Protocol;
    public logger:MuLogger;
    public remote:MuRPCClient<Protocol>;
    public schemas:MuRPCSchemas<Protocol>;

    private _transport:MuRPCServerTransport<Protocol, Connection>;
    private _server?:MuRPCServer<Protocol, Connection>;

    constructor (spec:{
        protocol:Protocol,
        client:MuRPCClientTransport<Protocol>,
        server:MuRPCServerTransport<Protocol, Connection>,
        logger:MuLogger,
    }) {
        this.protocol = spec.protocol;
        this.logger = spec.logger;
        this._transport = spec.server;
        this.remote = new MuRPCClient(spec.protocol, spec.client, spec.logger);
        this.schemas = this.remote.schemas;
    }

    public configure(spec:{
        authorize?:(conn:Connection) => Promise<boolean>,
        handlers:Partial<{
            [method in Protocol['api']]:
                (arg:Protocol['api'][method]['arg']['identity']) =>
                    Promise<Protocol['api'][method]['ret']['identity']>
        }>,
    }) {
        const handlers:any = {};
        const methods = Object.keys(this.protocol);
        for (let i = 0; i < methods.length; ++i) {
            if (methods[i] in spec.handlers) {
                handlers[methods[i]] = spec.handlers[methods[i]];
            } else {
                handlers[methods[i]] = this.remote.api[methods[i]];
            }
        }
        this._server = new MuRPCServer({
            protocol: this.protocol,
            transport: this._transport,
            authorize: spec.authorize || (() => Promise.resolve(true)),
            handlers,
            logger: this.logger,
        });
    }
}
