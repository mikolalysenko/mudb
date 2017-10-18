import { MuSocket, MuSocketServer } from 'munet/net';
import { MuMessageInterface, MuAnyMessageTable, MuAnyProtocolSchema } from './protocol';

export class MuRemoteClientProtocol<Schema extends MuAnyMessageTable> {
    public readonly sessionId:string;
    public readonly message:MuMessageInterface<Schema>['userAPI'];

    private _socket:MuSocket;

    constructor (socket:MuSocket) {
        this._socket = socket;
        this.sessionId = socket.sessionId;

        // generate message table
    }

    public send(bytes:Uint8Array, unreliable?:boolean) {
    }

    public close() {
        this._socket.close();
    }
}

export interface MuRemoteMessageInterface<Schema extends MuAnyMessageTable> {
    api:{ [message in keyof Schema]:(client:MuRemoteClientProtocol<Schema>, data:Schema[message]['identity'], unreliable?:boolean) => void };
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
    public readonly clients:{ [sessionId:string]:MuRemoteClientProtocol<Schema['client']> };

    public broadcast:MuMessageInterface<Schema['client']>['userAPI'];

    public configured:boolean = false;

    private server:MuServer;
    private protoSpec:MuServerProtocolSpec;

    constructor (name:string, schema:Schema, server:MuServer, protoSpec:MuServerProtocolSpec) {
        this.schema = schema;
        this.name = name;
        this.protoSpec = protoSpec;
    }

    public configure (spec:{
        message:MuRemoteMessageInterface<Schema['client']>['api'];
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
        this.protoSpec.messageHandlers = spec.message;
        this.protoSpec.rawHandler = spec.raw || noop;
        this.protoSpec.connectHandler = spec.connect || noop;
        this.protoSpec.disconnectHandler = spec.disconnect || noop;
        this.protoSpec.readyHandler = spec.ready || noop;
        this.protoSpec.closeHandler = spec.close || noop;
    }

    public broadcastRaw(bytes:Uint8Array, unreliable?:boolean) {
    }

    public protocol<SubSchema extends MuAnyProtocolSchema> (name:string, schema:SubSchema) : MuServerProtocol<SubSchema> {
        return this.server.protocol(this.name + '.' + name, schema);
    }
}

export type MuAnyServerProtocol = MuServerProtocol<MuAnyProtocolSchema>;

export class MuServer {
    public protocols:{ [name:string]:MuAnyServerProtocol } = {};
    private protocolSpec:{ [name:string]:MuServerProtocolSpec } = {};

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
        this._socketServer.start({
            ready: () => {
            },
            connection: (socket) => {
                socket.start({
                    ready: () => {
                    },
                    message: (data) => {
                    },
                    unreliableMessage: (data) => {
                    },
                    close: () => {
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
        Object.keys(this.protocolSpec).forEach((name) => {
            this.protocolSpec[name].closeHandler();
        });
    }

    public protocol<Schema extends MuAnyProtocolSchema> (name:string, schema:Schema) : MuServerProtocol<Schema> {
        if (name in this.protocols) {
            throw new Error('protocol already in use');
        }
        if (this._started || this._closed) {
            throw new Error('cannot add a protocol until the client has been initialized');
        }
        const spec = new MuServerProtocolSpec();
        const p = new MuServerProtocol(name, schema, this, spec);
        this.protocols[name] = p;
        this.protocolSpec[name] = spec;
        return p;
    }
}