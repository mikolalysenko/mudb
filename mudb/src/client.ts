import { MuSocket } from 'munet/net';
import { MuMessageInterface, MuAnyMessageTable, MuAnyProtocolSchema, MuProtocolFactory } from './protocol';

export class MuRemoteServer<Schema extends MuAnyMessageTable> {
    public message:MuMessageInterface<Schema>['userAPI'];
    public sendRaw:(bytes:Uint8Array, unreliable?:boolean) => void;
}

export type MuAnyClientProtocol = MuClientProtocol<MuAnyProtocolSchema>;

const noop = function () {};

export class MuClientProtocolSpec {
    public messageHandlers = {};
    public rawHandler:(bytes:Uint8Array, unreliable:boolean) => void = noop;
    public readyHandler:() => void = noop;
    public closeHandler:() => void = noop;
}

export class MuClientProtocol<Schema extends MuAnyProtocolSchema> {
    public readonly name:string;
    public readonly schema:Schema;
    public readonly server:MuRemoteServer<Schema['server']>;
    public readonly client:MuClient;

    public configured:boolean = false;

    private protoSpec:MuClientProtocolSpec;

    constructor (name:string, schema:Schema, client:MuClient, protoSpec:MuClientProtocolSpec) {
        this.schema = schema;
        this.client = client;
        this.server = new MuRemoteServer();
        this.name = name;
        this.protoSpec = protoSpec;
    }

    public configure (spec:{
        message:MuMessageInterface<Schema['client']>['abstractAPI'];
        raw?:(bytes:Uint8Array, unreliable:boolean) => void;
        ready?:() => void;
        close?:() => void;
    }) {
        if (this.configured) {
            throw new Error('protocol already configured');
        }
        this.configured = true;
        this.protoSpec.messageHandlers = spec.message;
        this.protoSpec.rawHandler = spec.raw || noop;
        this.protoSpec.readyHandler = spec.ready || noop;
        this.protoSpec.closeHandler = spec.close || noop;
    }

    public protocol<SubSchema extends MuAnyProtocolSchema> (schema:SubSchema) : MuClientProtocol<SubSchema> {
        return this.client.protocol(schema);
    }
}

export class MuClient {
    public readonly sessionId:string;
    public protocols:MuAnyClientProtocol[] = [];
    private _protocolSpec:MuClientProtocolSpec[] = [];

    public running:boolean = false;

    private _started:boolean = false;
    private _closed:boolean = false;
    private _socket:MuSocket;

    constructor (socket:MuSocket) {
        this._socket = socket;
        this.sessionId = socket.sessionId;
    }

    public start (spec?:{
        ready?:(error?:string) => void,
        close?:(error?:string) => void,
    }) {
        if (this._started || this._closed) {
            throw new Error('client already started');
        }

        this._started = true;

        const clientSchemas = this.protocols.map((p) => p.schema.client);
        const serverSchemas = this.protocols.map((p) => p.schema.server);

        const _spec = spec || {};
        this._socket.start({
            ready:(error) => {
                this.running = true;
                // configure all protocols;
                serverFactory.protocolNames.forEach((protocolName, protocolId) => {
                    const protocol = this.protocols[protocolName];
                    const factory = serverFactory.protocolFactories[protocolId];
                    protocol.server.message = factory.createDispatch([this._socket]);
                    protocol.server.sendRaw = factory.createSendRaw([this._socket]);
                });

                // initialize all protocols
                serverFactory.protocolNames.forEach((protocolName, protocolId) => {
                    const protoSpec = this._protocolSpec[protocolName];
                    protoSpec.readyHandler();
                });

                // fire ready event
                if (_spec.ready) {
                    _spec.ready();
                }
            },
            message: clientFactory.createParser(this._protocolSpec),
            close:(error) => {
                this.running = false;
                this._closed = true;

                // initialize all protocols
                serverFactory.protocolNames.forEach((protocolName, protocolId) => {
                    const protoSpec = this._protocolSpec[protocolName];
                    protoSpec.closeHandler();
                });

                if (_spec.close) {
                    _spec.close(error);
                }
            },
        });
    }

    public destroy () {
        if (!this.running) {
            throw new Error('client not running');
        }
        this._socket.close();
    }

    public protocol<Schema extends MuAnyProtocolSchema> (schema:Schema) : MuClientProtocol<Schema> {
        if (name in this.protocols) {
            throw new Error('protocol already in use');
        }
        if (this._started || this._closed) {
            throw new Error('cannot add a protocol until the client has been initialized');
        }
        const spec = new MuClientProtocolSpec();
        const p = new MuClientProtocol(name, schema, this, spec);
        this.protocols.push(p);
        this._protocolSpec.push(spec);
        return p;
    }
}