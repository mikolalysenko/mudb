import { MuSocket, MuSocketServer } from './socket';
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
    public rawHandler:(client, bytes:Uint8Array|string, unreliable:boolean) => void = noop;
    public readyHandler:() => void = noop;
    public connectHandler:(client) => void = noop;
    public disconnectHandler:(client) => void = noop;
    public closeHandler:() => void = noop;
}

export class MuServerProtocol<Schema extends MuAnyProtocolSchema> {
    public readonly schema:Schema;
    public readonly server:MuServer;
    public readonly clients:{ [sessionId:string]:MuRemoteClientProtocol<Schema['client']> } = {};

    public broadcast:MuMessageInterface<Schema['client']>['userAPI'];
    public broadcastRaw:(bytes:Uint8Array, unreliable?:boolean) => void;

    public configured:boolean = false;

    private _protoSpec:MuServerProtocolSpec;

    constructor (schema:Schema, server:MuServer, protoSpec:MuServerProtocolSpec) {
        this.schema = schema;
        this.server = server;
        this._protoSpec = protoSpec;
    }

    public configure (spec:{
        message:MuRemoteMessageInterface<Schema>['api'];
        raw?:(client:MuRemoteClientProtocol<Schema['client']>, data:Uint8Array|string, unreliable:boolean) => void;
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
        ready?:() => void,
        close?:(error?:any) => void,
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

                this.protocols.forEach((protocol, id) => {
                    protocol.broadcast = clientFactory.protocolFactories[id].createDispatch(sockets);
                    protocol.broadcastRaw = clientFactory.protocolFactories[id].createSendRaw(sockets);
                });

                this._protocolSpec.forEach((protoSpec) => {
                    protoSpec.readyHandler();
                });

                if (spec && spec.ready) {
                    spec.ready();
                }
            },
            close: (error) => {
                if (spec && spec.close) {
                    spec.close(error);
                }
            },
            connection: (socket) => {
                const clientObjects = new Array(this.protocols.length);
                const protocolHandlers = new Array(this.protocols.length);
                this.protocols.forEach((protocol, id) => {
                    const factory = clientFactory.protocolFactories[id];

                    const client = new MuRemoteClientProtocol(
                        socket,
                        factory.createDispatch([socket]),
                        factory.createSendRaw([socket]));
                    clientObjects[id] = client;

                    const protoSpec = this._protocolSpec[id];

                    const messageHandlers = {};
                    Object.keys(protoSpec.messageHandlers).forEach((message) => {
                        const handler = protoSpec.messageHandlers[message];
                        messageHandlers[message] = function (data, unreliable) { handler(client, data, unreliable); };
                    });

                    const rawHandler = protoSpec.rawHandler;
                    protocolHandlers[id] = {
                        rawHandler: function (bytes, unreliable) { rawHandler(client, bytes, unreliable); },
                        messageHandlers,
                    };
                });

                const parser = serverFactory.createParser(protocolHandlers);
                let firstPacket = true;

                function checkHashConsistency (packet) {
                    try {
                        const info = JSON.parse(packet);
                        if (info.clientHash !== clientFactory.hash ||
                            info.serverHash !== serverFactory.hash) {
                            socket.close();
                        }
                    } catch (e) {
                        socket.close();
                    }
                }

                socket.start({
                    ready: () => {
                        sockets.push(socket);

                        socket.send(JSON.stringify({
                            clientHash: clientFactory.hash,
                            serverHash: serverFactory.hash,
                        }));

                        this.protocols.forEach((protocol, id) => {
                            const client = clientObjects[id];
                            protocol.clients[socket.sessionId] = client;
                        });

                        this._protocolSpec.forEach((protoSpec, id) => {
                            const client = clientObjects[id];
                            protoSpec.connectHandler(client);
                        });
                    },
                    message: (data, unreliable) => {
                        if (!firstPacket) {
                            return parser(data, unreliable);
                        }
                        checkHashConsistency(data);
                        firstPacket = false;
                    },
                    close: () => {
                        this._protocolSpec.forEach((protoSpec, id) => {
                            const client = clientObjects[id];
                            protoSpec.disconnectHandler(client);
                        });

                        this.protocols.forEach((protocol) => {
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
        this._protocolSpec.forEach((protoSpec) => protoSpec.closeHandler());
    }

    public protocol<Schema extends MuAnyProtocolSchema> (schema:Schema) : MuServerProtocol<Schema> {
        if (this._started || this._closed) {
            throw new Error('cannot add a protocol until the client has been initialized');
        }
        const spec = new MuServerProtocolSpec();
        const p = new MuServerProtocol(schema, this, spec);
        this.protocols.push(p);
        this._protocolSpec.push(spec);
        return p;
    }
}
