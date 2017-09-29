import {
    MuSocket,
    MuSocketServer,
    MuSocketServerSpec,
    MuSessionId,
    MuSessionData,
    MuData,
    MuMessageHandler,
    MuCloseHandler,
    MuSocketSpec,
    MuConnectionHandler,
} from '../net';

function noop () {}

export class MuLocalSocket implements MuSocket {
    public sessionId:MuSessionId;

    private _server:MuLocalSocketServer;

    public _duplex:MuLocalSocket;
    public _onMessage:MuMessageHandler = noop;
    public _onUnreliableMessage:MuMessageHandler = noop;
    public _onClose:MuCloseHandler = noop;

    private _started:boolean = false;
    public _closed:boolean = false;
    public open:boolean = false;

    constructor (sessionId:string, server:MuLocalSocketServer) {
        this.sessionId = sessionId;
        this._server = server;
    }

    public start (spec:MuSocketSpec) {
        setTimeout(
            () => {
                if (this._closed) {
                    spec.ready.call(this, 'socket closed');
                    return;
                }
                if (this._started) {
                    spec.ready.call(this, 'socket already started');
                    return;
                }
                this._onMessage = spec.message;
                this._onUnreliableMessage = spec.unreliableMessage;
                this._onClose = spec.close;
                this._started = true;
                this.open = true;

                spec.ready.call(this);
            },
            0);
    }

    private _pendingMessages:MuData[] = [];
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

export class MuLocalSocketServer implements MuSocketServer {
    public clients:MuSocket[] = [];

    public _pendingSockets:MuSocket[] = [];

    private _started:boolean = false;
    private _closed:boolean = false;
    public open:boolean = false;

    private _onConnection:MuConnectionHandler;

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

    public start (spec:MuSocketServerSpec) {
        setTimeout(
            () => {
                if (this._started) {
                    return spec.ready.call(this, 'server already started');
                }
                this._onConnection = spec.connection;
                this._started = true;
                this.open = true;
                spec.ready.call(this);

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

export type MuLocalSocketServerSpec = {
};

export function createLocalServer (config:MuLocalSocketServerSpec) : MuLocalSocketServer {
    return new MuLocalSocketServer();
}

export type MuLocalSocketSpec = {
    server:MuSocketServer;
};

export function createLocalClient (sessionId:MuSessionId, spec:MuLocalSocketSpec) : MuLocalSocket {
    const server = <MuLocalSocketServer>spec.server;
    const clientSocket = new MuLocalSocket(sessionId, server);
    const serverSocket = new MuLocalSocket(clientSocket.sessionId, server);
    clientSocket._duplex = serverSocket;
    serverSocket._duplex = clientSocket;
    server._handleConnection(serverSocket);
    return clientSocket;
}