import { MuSocket } from './socket/socket';
import { MuMessageInterface, MuAnyMessageTable, MuAnyProtocolSchema, MuProtocolFactory, MuProtocolBandwidth } from './protocol';
import { MuLogger, MuDefaultLogger } from './logger';

const noop = function () {};

export class MuRemoteServer<Schema extends MuAnyMessageTable> {
    public message = <MuMessageInterface<Schema>['userAPI']>{};
    public sendRaw:(bytes:Uint8Array|string, unreliable?:boolean) => void = noop;
}

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

    private _protocolSpec:MuClientProtocolSpec;

    constructor (schema:Schema, client:MuClient, protocolSpec:MuClientProtocolSpec) {
        this.schema = schema;
        this.client = client;
        this.server = new MuRemoteServer();
        this._protocolSpec = protocolSpec;
    }

    public configure (spec:{
        message:MuMessageInterface<Schema['client']>['abstractAPI'];
        raw?:(bytes:Uint8Array|string, unreliable:boolean) => void;
        ready?:() => void;
        close?:() => void;
    }) {
        if (this.configured) {
            throw new Error('mudb: protocol has been configured');
        }
        this.configured = true;
        this._protocolSpec.messageHandlers = spec.message;
        this._protocolSpec.rawHandler = spec.raw || noop;
        this._protocolSpec.readyHandler = spec.ready || noop;
        this._protocolSpec.closeHandler = spec.close || noop;
    }
}

export interface MuAnyClientProtocol extends MuClientProtocol<MuAnyProtocolSchema> {}

export class MuClient {
    public readonly sessionId:string;
    public protocols:MuAnyClientProtocol[] = [];
    private _protocolSpecs:MuClientProtocolSpec[] = [];

    public running:boolean = false;
    private _started:boolean = false;
    private _closed:boolean = false;
    private _socket:MuSocket;

    public logger:MuLogger;

    private _shouldValidateProtocol:boolean;

    public bandwidth:MuProtocolBandwidth[] = [];

    constructor (socket:MuSocket, logger?:MuLogger, skipProtocolValidation?:boolean) {
        this._socket = socket;
        this.sessionId = socket.sessionId;
        this.logger = logger || MuDefaultLogger;
        this._shouldValidateProtocol = !skipProtocolValidation;
    }

    public start (spec_?:{
        ready?:(error?:string) => void,
        close?:(error?:string) => void,
    }) {
        if (this._started || this._closed) {
            throw new Error('mudb: client has been started');
        }

        this._started = true;

        const clientSchemas = this.protocols.map((p) => p.schema.client);
        const clientFactory = new MuProtocolFactory(clientSchemas);

        const serverSchemas = this.protocols.map((p) => p.schema.server);
        const serverFactory = new MuProtocolFactory(serverSchemas);

        const spec = spec_ || {};

        const checkProtocolConsistency = (packet) => {
            try {
                const data = JSON.parse(packet);
                if (data.clientJsonStr !== clientFactory.jsonStr ||
                    data.serverJsonStr !== serverFactory.jsonStr) {
                    this.logger.error('protocol mismatch');
                    this._socket.close();
                }
            } catch (e) {
                this.logger.exception(e);
                this._socket.close();
            }
        };

        const parser = clientFactory.createParser(this._protocolSpecs, this.logger, this.bandwidth, this.sessionId);
        let validationPacket = this._shouldValidateProtocol;

        this._socket.open({
            ready: () => {
                this.running = true;

                if (this._shouldValidateProtocol) {
                    this._socket.send(JSON.stringify({
                        clientJsonStr: clientFactory.jsonStr,
                        serverJsonStr: serverFactory.jsonStr,
                    }));
                }

                // configure all protocols
                serverFactory.protocolFactories.forEach((factory, protocolId) => {
                    this.bandwidth[protocolId] = {
                        [this.sessionId]: {
                            sent: {
                                raw: {
                                    count: 0,
                                    bytes: 0,
                                },
                            },
                            received: {
                                raw: {
                                    count: 0,
                                    bytes: 0,
                                },
                            },
                        },
                    };
                    const protocol = this.protocols[protocolId];
                    protocol.server.message = factory.createDispatch([this._socket], this.bandwidth[protocolId]);
                    protocol.server.sendRaw = factory.createSendRaw([this._socket], this.bandwidth[protocolId]);
                });

                // initialize all protocols
                this._protocolSpecs.forEach((protoSpec) => {
                    protoSpec.readyHandler();
                });

                // fire ready event
                if (spec.ready) {
                    try {
                        spec.ready();
                    } catch (e) {
                        this.logger.exception(e);
                    }
                }
            },
            message: (data, unreliable) => {
                if (!validationPacket) {
                    try {
                        parser(data, unreliable);
                    } catch (e) {
                        this.logger.exception(e);
                    }
                } else {
                    checkProtocolConsistency(data);
                    validationPacket = false;
                }
            },
            close: (error) => {
                this.running = false;
                this._closed = true;
                this._protocolSpecs.forEach((protoSpec) => protoSpec.closeHandler());

                if (spec.close) {
                    try {
                        spec.close(error);
                    } catch (e) {
                        this.logger.exception(e);
                    }
                }
            },
        });
    }

    public destroy () {
        if (!this.running) {
            throw new Error('mudb: client is not running');
        }
        this._socket.close();
    }

    public protocol<Schema extends MuAnyProtocolSchema> (schema:Schema) : MuClientProtocol<Schema> {
        if (this._started || this._closed) {
            throw new Error('mudb: attempt to register protocol after client has been started');
        }
        this.logger.log(`register ${schema.name} protocol`);

        const spec = new MuClientProtocolSpec();
        const p = new MuClientProtocol(schema, this, spec);
        this.protocols.push(p);
        this._protocolSpecs.push(spec);
        return p;
    }
}
