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
} from 'mudb/socket';
import {
    allocBuffer,
    freeBuffer,
    MuBuffer,
} from 'mustreams';

function noop () {}

class BufferWrapper {
    private _buffer:MuBuffer;
    public bytes:Uint8Array;

    constructor (data:Uint8Array) {
        const size = data.length;
        const buffer = allocBuffer(size);
        const bytes = buffer.uint8.subarray(0, size);
        bytes.set(data);
        this._buffer = buffer;
        this.bytes = bytes;
    }

    public free () {
        freeBuffer(this._buffer);
    }
}

type PendingMessage = string | BufferWrapper;

export class MuLocalSocket implements MuSocket {
    public sessionId:MuSessionId;

    private _server:MuLocalSocketServer;

    public _duplex!:MuLocalSocket;
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
                this._onClose = spec.close;
                this._started = true;
                this.open = true;

                spec.ready.call(this);
            },
            0);
    }

    private _pendingMessages:PendingMessage[] = [];
    private _pendingDrainTimeout;
    private _handleDrain = () => {
        this._pendingDrainTimeout = 0;
        for (let i = 0; i < this._pendingMessages.length; ++i) {
            if (this._closed) {
                return;
            }
            const message = this._pendingMessages[i];
            try {
                if (typeof message === 'string') {
                    this._duplex._onMessage(message, false);
                } else {
                    this._duplex._onMessage(message.bytes, false);
                    message.free();
                }
            } catch (e) { }
        }
        this._pendingMessages.length = 0;
    }

    public send(data:MuData, unreliable?:boolean) {
        if (this._closed) {
            return;
        }
        const wrapped = typeof data === 'string' ? data : new BufferWrapper(data);
        if (unreliable) {
            this._pendingUnreliableMessages.push(wrapped);
            setTimeout(this._handleUnreliableDrain, 0);
        } else {
            this._pendingMessages.push(wrapped);
            if (!this._pendingDrainTimeout) {
                this._pendingDrainTimeout = setTimeout(this._handleDrain, 0);
            }
        }
    }

    private _pendingUnreliableMessages:PendingMessage[] = [];
    private _handleUnreliableDrain = () => {
        if (this._closed) {
            return;
        }
        const message = this._pendingUnreliableMessages.pop();
        if (typeof message === 'string') {
            this._duplex._onMessage(message, true);
        } else if (message) {
            this._duplex._onMessage(message.bytes, true);
            message.free();
        }
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

    private _onConnection!:MuConnectionHandler;
    private _onClose!:MuCloseHandler;

    constructor () {
    }

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
                this._onClose = spec.close;
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
        this._onClose();
    }
}

export function createLocalSocketServer () : MuLocalSocketServer {
    return new MuLocalSocketServer();
}

export function createLocalSocket (spec:{
    sessionId:MuSessionId;
    server:MuLocalSocketServer;
}) : MuLocalSocket {
    const server = <MuLocalSocketServer>spec.server;
    const clientSocket = new MuLocalSocket(spec.sessionId, server);
    const serverSocket = new MuLocalSocket(clientSocket.sessionId, server);
    clientSocket._duplex = serverSocket;
    serverSocket._duplex = clientSocket;
    server._handleConnection(serverSocket);
    return clientSocket;
}
