import { 
    HelSocket, 
    HelServer,
    HelSessionId,
    HelSessionData,
    HelData,
    HelMessageHandler,
    HelCloseHandler,
    HelSocketSpec
} from '../net';

function noop () {};

function connectDuplexPair (a:HelLocalSocket, b:HelLocalSocket) {
    a._duplex = b
    b._duplex = a
}

export class HelLocalSocket implements HelSocket {
    public sessionId:HelSessionId

    private _server:LocalServer;

    public _duplex:HelLocalSocket = null;
    public _onMessage:HelMessageHandler = noop;
    public _onUnreliableMessage:HelMessageHandler = noop;
    public _onClose:HelCloseHandler = noop;

    private _started:boolean = false;
    private _closed:boolean = false;
    
    constructor (sessionId:string, server:LocalServer) {
        this.sessionId = sessionId;
        this._server = server;
    }

    public start (spec:HelSocketSpec) {
        if (this._started) {
            spec.onReady.call(this, 'socket already started');
            return
        }
        this._onMessage = spec.onMessage;
        this._onUnreliableMessage = spec.onUnreliableMessage
        this._onClose = spec.onClose;
        this._started = true;

        spec.onReady.call(this);
    }

    private _pendingMessages:HelData[] = [];
    private _pendingDrainTimeout = 0;
    private _handleDrain = () => {
        this._pendingDrainTimeout = 0;
        for (let i = 0; i < this._pendingMessages.length; ++i) {
            if (this._closed) {
                return;
            }
            const message = this._pendingMessages[i];
            try {
                this._duplex._onMessage(message);
            } catch (e) { }
        }
        this._pendingMessages.length = 0;
    }

    public send(data:any) {
        this._pendingMessages.push(data);
        if (!this._pendingDrainTimeout) {
            this._pendingDrainTimeout = setTimeout(this._handleDrain, 0);
        }
    }

    private _pendingUnreliableMessages:any[] = [];
    private _handleUnreliableDrain = () => {
        if (this._closed) {
            return;
        }
        const message = this._pendingUnreliableMessages.pop();
        this._clientPair.onMessage(this._clientPair, message);
    }

    public sendUnreliable (data:any) {
        if (this._closed) {
            return;
        }
        this._pendingUnreliableMessages.push(data)
        setTimeout(this._handleUnreliableDrain, 0);
    }

    public close () {
        if (this._closed) {
            return;
        }
        this._closed = true;
        // remove from serve client connections
        this.onClose();
    }
}


export class LocalServer implements INetServer {
    public clients:LocalClientConnection[];

    private _handleConnection:(sessionData:any, connection:INetClient, next:(error) => void)  => void;

    public onReady (handler:(error?:any) => void) {
        setTimeout(handler, 0);
    }

    public onConnection(handler:(sessionData:any, connection:INetClient, next:(error) => void)  => void) {
        this._handleConnection = handler;
    }

    public broadcast(data:any) {
        for (const client of this.clients) {
            client.send(data);
        }
    }

    public close() {
        for (let i = this.clients.length - 1; i >= 0; --i) {
            this.clients[i].close();
        }
    }
}

export type LocalServerConfig = {
    // TODO: Add latency simulation
};

export function createLocalServer (config?:LocalServerConfig) : LocalServer {
    const server = new LocalServer();
    return server;
}

export type LocalClientConfig = {
    // TODO: Add latency simulation
    server:LocalServer;
};

export function createLocalClient (config:LocalClientConfig, onReady:NetClientHandler) : LocalClient {
    const client = new LocalClient();
    client._connectToServer(config.server);
    return client;
}