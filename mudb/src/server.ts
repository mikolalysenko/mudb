import { MuSocket, MuSocketServer } from 'munet/net';
import { MuMessageInterface, MuAnyMessageTable, MuAnyProtocolSchema, MuProtocolFactory } from './protocol';

export class MuRemoteClientProtocol<Schema extends MuAnyMessageTable> {
    public readonly sessionId:string;
    public readonly message:MuMessageInterface<Schema>['userAPI'];
    public readonly sendRaw:(bytes:Uint8Array, unreliable?:boolean) => void;

    private _socket:MuSocket;

    constructor (socket:MuSocket, message:MuMessageInterface<Schema>['userAPI'], sendRaw) {
        this._socket = socket;
        this.sessionId = socket.sessionId;
        this.message = message;
        this.sendRaw = sendRaw;
    }

    public close() {
        this._socket.close();
    }
}

export interface MuRemoteMessageInterface<Schema extends MuAnyProtocolSchema> {
    api:{ [message in keyof Schema['server']]:(client:MuRemoteClientProtocol<Schema['client']>, data:Schema['server'][message]['identity'], unreliable?:boolean) => void };
}

const noop = function () {};

export class MuServerProtocolSpec {
    public messageHandlers = {};
    public rawHandler:(client, bytes:Uint8Array, unreliable:boolean) => void = noop;
    public readyHandler:() => void = noop;
    public connectHandler:(client) => void = noop;
    public disconnectHandler:(client) => void = noop;
    public closeHandler:() => void = noop;
}

export class MuServerProtocol<Schema extends MuAnyProtocolSchema> {
    public readonly name:string;
    public readonly schema:Schema;
    public readonly server:MuServer;
    public readonly clients:{ [sessionId:string]:MuRemoteClientProtocol<Schema['client']> } = {};

    public broadcast:MuMessageInterface<Schema['client']>['userAPI'];
    public broadcastRaw:(bytes:Uint8Array, unreliable?:boolean) => void;

    public configured:boolean = false;

    private _protoSpec:MuServerProtocolSpec;

    constructor (name:string, schema:Schema, server:MuServer, protoSpec:MuServerProtocolSpec) {
        this.schema = schema;
        this.name = name;
        this.server = server;
        this._protoSpec = protoSpec;
    }

    public configure (spec:{
        message:MuRemoteMessageInterface<Schema>['api'];
        raw?:(client:MuRemoteClientProtocol<Schema['client']>, bytes:Uint8Array, unreliable:boolean) => void;
        ready?:() => void;
        connect?:(client:MuRemoteClientProtocol<Schema['client']>) => void;
        disconnect?:(client:MuRemoteClientProtocol<Schema['client']>) => void;
        close?:() => void;
    }) {
        if (this.configured) {
            throw new Error('protocol already configured');
        }
        this.configured = true;
        this._protoSpec.messageHandlers = spec.message;
        this._protoSpec.rawHandler = spec.raw || noop;
        this._protoSpec.connectHandler = spec.connect || noop;
        this._protoSpec.disconnectHandler = spec.disconnect || noop;
        this._protoSpec.readyHandler = spec.ready || noop;
        this._protoSpec.closeHandler = spec.close || noop;
    }

    public protocol<SubSchema extends MuAnyProtocolSchema> (name:string, schema:SubSchema) : MuServerProtocol<SubSchema> {
        return this.server.protocol(this.name + '.' + name, schema);
    }
}

export type MuAnyServerProtocol = MuServerProtocol<MuAnyProtocolSchema>;

export class MuServer {
    public protocols:MuAnyServerProtocol[] = [];
    private _protocolSpec:MuServerProtocolSpec[] = [];

    public running:boolean = false;

    private _started:boolean = false;
    private _closed:boolean = false;

    private _socketServer:MuSocketServer;

    constructor (socketServer:MuSocketServer) {
        this._socketServer = socketServer;
    }

    public start (spec?:{
        ready?:(error?:string) => void,
        close?:(error?:string) => void,
    }) {
        if (this._started || this._closed) {
            throw new Error('server already started');
        }

        this._started = true;

        const clientSchemas = this.protocols.map((p) => p.schema.client);
        const clientFactory = new MuProtocolFactory(clientSchemas);

        const serverSchemas = this.protocols.map((p) => p.schema.server);
        const serverFactory = new MuProtocolFactory(serverSchemas);

        const sockets:MuSocket[] = [];

        this._socketServer.start({
            ready: () => {
                this.running = true;
            },
            connection: (socket) => {
                const clientObjects = {};
                const protocolHandlers = {};
                this.protocols.forEach((protocol, id) => {
                    const factory = clientFactory.protocolFactories[id];

                    const client = new MuRemoteClientProtocol(
                        socket,
                        factory.createDispatch([socket]),
                        factory.createSendRaw([socket]));
                    clientObjects[name] = client;

                    const protoSpec = this._protocolSpec[name];

                    const messageHandlers = {};
                    Object.keys(protoSpec.messageHandlers).forEach((message) => {
                        const handler = protoSpec.messageHandlers[message];
                        messageHandlers[message] = function (data, unreliable) { handler(client, data, unreliable); };
                    });

                    const rawHandler = protoSpec.rawHandler;
                    protocolHandlers[name] = {
                        rawHandler: function (bytes, unreliable) { rawHandler(client, bytes, unreliable); },
                        messageHandlers,
                    };
                });
                socket.start({
                    ready: () => {
                        sockets.push(socket);

                        clientFactory.protocolNames.forEach((name, id) => {
                            const protocol = this.protocols[name];
                            const client = clientObjects[name];
                            protocol.clients[socket.sessionId] = client;
                        });

                        clientFactory.protocolNames.forEach((name, id) => {
                            const protoSpec = this._protocolSpec[name];
                            const client = clientObjects[name];
                            protoSpec.connectHandler(client);
                        });
                    },
                    message: serverFactory.createParser(protocolHandlers),
                    close: () => {
                        clientFactory.protocolNames.forEach((name, id) => {
                            const protoSpec = this._protocolSpec[name];
                            const client = clientObjects[name];
                            protoSpec.disconnectHandler(client);
                        });

                        clientFactory.protocolNames.forEach((name, id) => {
                            const protocol = this.protocols[name];
                            delete protocol.clients[socket.sessionId];
                        });

                        sockets.splice(sockets.indexOf(socket), 1);
                    },
                });
            },
        });
    }

    public destroy () {
        if (!this.running) {
            throw new Error('client not running');
        }
        this._closed = true;
        this.running = false;
        this._socketServer.close();
        Object.keys(this._protocolSpec).forEach((name) => {
            this._protocolSpec[name].closeHandler();
        });
    }

    public protocol<Schema extends MuAnyProtocolSchema> (schema:Schema) : MuServerProtocol<Schema> {
        if (name in this.protocols) {
            throw new Error('protocol already in use');
        }
        if (this._started || this._closed) {
            throw new Error('cannot add a protocol until the client has been initialized');
        }
        const spec = new MuServerProtocolSpec();
        const p = new MuServerProtocol(name, schema, this, spec);
        this.protocols.push(p);
        this._protocolSpec.push(spec);
        return p;
    }
}