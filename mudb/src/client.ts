import { MuSocket } from './socket';
import { MuMessageInterface, MuAnyMessageTable, MuAnyProtocolSchema, MuProtocolFactory } from './protocol';

export class MuRemoteServer<Schema extends MuAnyMessageTable> {
    public message!:MuMessageInterface<Schema>['userAPI'];
    public sendRaw!:(bytes:Uint8Array|string, unreliable?:boolean) => void;
}

export type MuAnyClientProtocol = MuClientProtocol<MuAnyProtocolSchema>;

const noop = function () {};

export class MuClientProtocolSpec {
    public messageHandlers = {};
    public rawHandler:(data:Uint8Array|string, unreliable:boolean) => void = noop;
    public readyHandler:() => void = noop;
    public closeHandler:() => void = noop;
}

export class MuClientProtocol<Schema extends MuAnyProtocolSchema> {
    public readonly schema:Schema;
    public readonly server:MuRemoteServer<Schema['server']>;
    public readonly client:MuClient;

    public configured:boolean = false;

    private protoSpec:MuClientProtocolSpec;

    constructor (schema:Schema, client:MuClient, protoSpec:MuClientProtocolSpec) {
        this.schema = schema;
        this.client = client;
        this.server = new MuRemoteServer();
        this.protoSpec = protoSpec;
    }

    public configure (spec:{
        message:MuMessageInterface<Schema['client']>['abstractAPI'];
        raw?:(bytes:Uint8Array|string, unreliable:boolean) => void;
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
        const clientFactory = new MuProtocolFactory(clientSchemas);

        const serverSchemas = this.protocols.map((p) => p.schema.server);
        const serverFactory = new MuProtocolFactory(serverSchemas);

        const _spec = spec || {};

        let firstPacket = true;
        const socket = this._socket;
        function checkHashConsistency (packet) {
            try {
                const data = JSON.parse(packet);
                if (data.clientHash !== clientFactory.hash ||
                    data.serverHash !== serverFactory.hash) {
                    socket.close();
                }
            } catch (e) {
                socket.close();
            }
        }
        const parser = clientFactory.createParser(this._protocolSpec);

        this._socket.start({
            ready:() => {
                this.running = true;

                this._socket.send(JSON.stringify({
                    clientHash: clientFactory.hash,
                    serverHash: serverFactory.hash,
                }));

                // configure all protocols;
                serverFactory.protocolFactories.forEach((factory, protocolId) => {
                    const protocol = this.protocols[protocolId];
                    protocol.server.message = factory.createDispatch([this._socket]);
                    protocol.server.sendRaw = factory.createSendRaw([this._socket]);
                });

                // initialize all protocols
                this._protocolSpec.forEach((protoSpec) => {
                    protoSpec.readyHandler();
                });

                // fire ready event
                if (_spec.ready) {
                    _spec.ready();
                }
            },
            message: (data, unreliable) => {
                if (!firstPacket) {
                    return parser(data, unreliable);
                }
                checkHashConsistency(data);
                firstPacket = false;
            },
            close:(error) => {
                this.running = false;
                this._closed = true;

                this._protocolSpec.forEach((protoSpec) => protoSpec.closeHandler());

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
        if (this._started || this._closed) {
            throw new Error('cannot add a protocol until the client has been initialized');
        }
        const spec = new MuClientProtocolSpec();
        const p = new MuClientProtocol(schema, this, spec);
        this.protocols.push(p);
        this._protocolSpec.push(spec);
        return p;
    }
}
