import {
    HelSocket,
    HelServer,
    HelServerSpec,
    HelSessionId,
    HelSessionData,
    HelData,
    HelMessageHandler,
    HelCloseHandler,
    HelSocketSpec,
    HelConnectionHandler,
} from '../net';

function noop () {}

export class HelLocalSocket implements HelSocket {
    public sessionId:HelSessionId;

    private _server:HelLocalServer;

    public _duplex:HelLocalSocket;
    public _onMessage:HelMessageHandler = noop;
    public _onUnreliableMessage:HelMessageHandler = noop;
    public _onClose:HelCloseHandler = noop;

    private _started:boolean = false;
    public _closed:boolean = false;
    public open:boolean = false;

    constructor (sessionId:string, server:HelLocalServer) {
        this.sessionId = sessionId;
        this._server = server;
    }

    public start (spec:HelSocketSpec) {
        setTimeout(
            () => {
                if (this._closed) {
                    spec.onReady.call(this, 'socket closed');
                    return;
                }
                if (this._started) {
                    spec.onReady.call(this, 'socket already started');
                    return;
                }
                this._onMessage = spec.onMessage;
                this._onUnreliableMessage = spec.onUnreliableMessage;
                this._onClose = spec.onClose;
                this._started = true;
                this.open = true;

                spec.onReady.call(this);
            },
            0);
    }

    private _pendingMessages:HelData[] = [];
    private _pendingDrainTimeout;
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
        this._duplex._onMessage(message);
    }

    public sendUnreliable (data:any) {
        if (this._closed) {
            return;
        }
        this._pendingUnreliableMessages.push(data);
        setTimeout(this._handleUnreliableDrain, 0);
    }

    public close () {
        if (this._closed) {
            return;
        }
        this._closed = true;
        this.open = false;
        this._server._removeSocket(this);
        this._onClose();
        this._duplex.close();
    }
}

function removeIfExists (array, element) {
    const idx = array.indexOf(element);
    if (idx >= 0) {
        array[idx] = array[array.length - 1];
        array.pop();
    }
}

export class HelLocalServer implements HelServer {
    public clients:HelSocket[] = [];

    public _pendingSockets:HelSocket[] = [];

    private _started:boolean = false;
    private _closed:boolean = false;
    public open:boolean = false;

    private _onConnection:HelConnectionHandler;

    public _handleConnection (socket) {
        if (this.open) {
            this.clients.push(socket);
            this._onConnection(socket);
        } else if (this._closed) {
            socket.close();
        } else {
            this._pendingSockets.push(socket);
        }
    }

    public _removeSocket (socket) {
        removeIfExists(this.clients, socket);
        removeIfExists(this._pendingSockets, socket);
    }

    public start (spec:HelServerSpec) {
        setTimeout(
            () => {
                if (this._started) {
                    return spec.onReady.call(this, 'server already started');
                }
                this._onConnection = spec.onConnection;
                this._started = true;
                this.open = true;
                spec.onReady.call(this);

                while (this._pendingSockets.length > 0) {
                    const socket = this._pendingSockets.pop();
                    this._handleConnection(socket);
                }
            },
            0);
    }

    public close() {
        if (this._started || this._closed) {
            return;
        }
        this.open = false;
        for (let i = this.clients.length - 1; i >= 0; --i) {
            this.clients[i].close();
        }
    }
}

export function createLocalServer (config:{}) : HelLocalServer {
    return new HelLocalServer();
}

export function createLocalClient (config:{
    sessionId:HelSessionId;
    server:HelLocalServer;
}) : HelLocalSocket {
    const clientSocket = new HelLocalSocket(config.sessionId, config.server);
    const serverSocket = new HelLocalSocket(clientSocket.sessionId, config.server);
    clientSocket._duplex = serverSocket;
    serverSocket._duplex = clientSocket;
    config.server._handleConnection(serverSocket);
    return clientSocket;
}