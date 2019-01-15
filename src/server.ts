import { MuSocket, MuSocketServer } from './socket';
import { MuMessageInterface, MuAnyMessageTable, MuAnyProtocolSchema, MuProtocolFactory } from './protocol';
import { MuTrace } from './trace';

export class MuRemoteClient<Schema extends MuAnyMessageTable> {
    public readonly sessionId:string;
    public readonly message:MuMessageInterface<Schema>['userAPI'];
    public readonly sendRaw:(bytes:Uint8Array|string, unreliable?:boolean) => void;

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
    api:{
        [message in keyof Schema['server']]:(
            client:MuRemoteClient<Schema['client']>,
            data:Schema['server'][message]['identity'],
            unreliable?:boolean,
        ) => void;
    };
}

const noop = function () {};

export class MuServerProtocolSpec {
    public messageHandlers = {};
    public readyHandler:() => void = noop;
    public connectHandler:(client) => void = noop;
    public rawHandler:(client, bytes:Uint8Array|string, unreliable:boolean) => void = noop;
    public disconnectHandler:(client) => void = noop;
    public closeHandler:() => void = noop;
}

export class MuServerProtocol<Schema extends MuAnyProtocolSchema> {
    public readonly schema:Schema;
    public readonly server:MuServer;
    public readonly clients:{ [sessionId:string]:MuRemoteClient<Schema['client']> } = {};

    public broadcast = <MuMessageInterface<Schema['client']>['userAPI']>{};
    public broadcastRaw:(bytes:Uint8Array|string, unreliable?:boolean) => void = noop;

    public configured:boolean = false;

    private _protocolSpec:MuServerProtocolSpec;

    constructor (schema:Schema, server:MuServer, protocolSpec:MuServerProtocolSpec) {
        this.schema = schema;
        this.server = server;
        this._protocolSpec = protocolSpec;
    }

    public configure (spec:{
        message:MuRemoteMessageInterface<Schema>['api'];
        raw?:(client:MuRemoteClient<Schema['client']>, data:Uint8Array|string, unreliable:boolean) => void;
        ready?:() => void;
        connect?:(client:MuRemoteClient<Schema['client']>) => void;
        disconnect?:(client:MuRemoteClient<Schema['client']>) => void;
        close?:() => void;
    }) {
        if (this.configured) {
            throw new Error('mudb: protocol has been configured');
        }
        this.configured = true;
        this._protocolSpec.messageHandlers = spec.message;
        this._protocolSpec.readyHandler = spec.ready || noop;
        this._protocolSpec.connectHandler = spec.connect || noop;
        this._protocolSpec.rawHandler = spec.raw || noop;
        this._protocolSpec.disconnectHandler = spec.disconnect || noop;
        this._protocolSpec.closeHandler = spec.close || noop;
    }
}

export interface MuAnyServerProtocol extends MuServerProtocol<MuAnyProtocolSchema> {}

export class MuServer {
    public protocols:MuAnyServerProtocol[] = [];
    private _protocolSpecs:MuServerProtocolSpec[] = [];

    public running:boolean = false;
    private _started:boolean = false;
    private _closed:boolean = false;

    private _socketServer:MuSocketServer;

    public trace:MuTrace | null;

    constructor (socketServer:MuSocketServer, trace?:MuTrace) {
        this._socketServer = socketServer;
        this.trace = trace || null;
    }

    public start (spec?:{
        ready?:() => void,
        close?:(error?:any) => void,
    }) {
        if (this._started || this._closed) {
            throw new Error('mudb: server has been started');
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

                this._protocolSpecs.forEach((protocolSpec) => {
                    protocolSpec.readyHandler();
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
                // one client object per protocol
                const clientObjects = new Array(this.protocols.length);
                const protocolHandlers = new Array(this.protocols.length);
                this.protocols.forEach((protocol, id) => {
                    const factory = clientFactory.protocolFactories[id];

                    const client = new MuRemoteClient(
                        socket,
                        factory.createDispatch([socket]),
                        factory.createSendRaw([socket]));
                    clientObjects[id] = client;

                    const protocolSpec = this._protocolSpecs[id];

                    const messageHandlers = {};
                    Object.keys(protocolSpec.messageHandlers).forEach((message) => {
                        const handler = protocolSpec.messageHandlers[message];
                        messageHandlers[message] = function (data, unreliable) { handler(client, data, unreliable); };
                    });

                    const rawHandler = protocolSpec.rawHandler;
                    protocolHandlers[id] = {
                        rawHandler: function (bytes, unreliable) { rawHandler(client, bytes, unreliable); },
                        messageHandlers,
                    };
                });

                function checkHashConsistency (packet) {
                    try {
                        const info = JSON.parse(packet);
                        if (info.clientHash !== clientFactory.hash ||
                            info.serverHash !== serverFactory.hash) {
                            throw new Error('incompatible protocols');
                        }
                    } catch (e) {
                        console.error(`mudb: kill connection ${socket.sessionId}: ${e}`);
                        socket.close();
                    }
                }

                if (this.trace) {
                    const protocolNames = this.protocols.map((protocol) => protocol.schema.name);
                    this.trace.getIds(protocolNames);
                }

                const parser = serverFactory.createParser(protocolHandlers, this.trace);
                let firstPacket = true;

                socket.open({
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

                        this._protocolSpecs.forEach((protocolSpec, id) => {
                            const client = clientObjects[id];
                            protocolSpec.connectHandler(client);
                        });
                    },
                    message: (data, unreliable) => {
                        if (!firstPacket) {
                            try {
                                return parser(data, unreliable);
                            } catch (e) {
                                console.error(`mudb: kill connection ${socket.sessionId}: ${e}`);
                                socket.close();
                            }
                        }
                        checkHashConsistency(data);
                        firstPacket = false;
                    },
                    close: (error?:any) => {
                        this._protocolSpecs.forEach((protocolSpec, id) => {
                            const client = clientObjects[id];
                            protocolSpec.disconnectHandler(client);
                        });

                        this.protocols.forEach((protocol) => {
                            delete protocol.clients[socket.sessionId];
                        });

                        sockets.splice(sockets.indexOf(socket), 1);

                        if (error) {
                            if (this.trace) {
                                this.trace.logError(`socket ${socket.sessionId} was closed due to ${error}`);
                            }
                        }
                    },
                });
            },
        });
    }

    public destroy () {
        if (!this.running) {
            throw new Error('mudb: server is not running');
        }
        this._closed = true;
        this.running = false;
        this._socketServer.close();
        this._protocolSpecs.forEach((protocolSpec) => protocolSpec.closeHandler());
    }

    public protocol<Schema extends MuAnyProtocolSchema> (schema:Schema) : MuServerProtocol<Schema> {
        if (this._started || this._closed) {
            throw new Error('mudb: attempt to register protocol after server has been started');
        }
        if (this.trace && schema.name) {
            this.trace.log(`register ${schema.name} protocol`);
        }

        const spec = new MuServerProtocolSpec();
        const p = new MuServerProtocol(schema, this, spec);
        this.protocols.push(p);
        this._protocolSpecs.push(spec);
        return p;
    }
}
