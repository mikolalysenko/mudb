import {
    MuSocket,
    MuSocketServer,
    MuSocketServerSpec,
    MuSessionId,
    MuData,
    MuSocketState,
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
        this._buffer = allocBuffer(data.length);

        // make a copy of `data`
        this.bytes = this._buffer.uint8.subarray(0, data.length);
        this.bytes.set(data);
    }

    public free () {
        freeBuffer(this._buffer);
    }
}

type PendingMessage = string | BufferWrapper;

export class MuLocalSocket implements MuSocket {
    public sessionId:MuSessionId;

    private _server:MuLocalSocketServer;

    public _duplex:MuLocalSocket;

    private _onMessage:MuMessageHandler = noop;
    private _onUnreliableMessage:MuMessageHandler = noop;
    private _onClose:MuCloseHandler = noop;

    public state = MuSocketState.INIT;

    constructor (sessionId:string, server:MuLocalSocketServer) {
        this.sessionId = sessionId;
        this._server = server;
    }

    public open (spec:MuSocketSpec) {
        setTimeout(
            () => {
                if (this.state === MuSocketState.OPEN) {
                    spec.close('socket already open');
                    return;
                }
                if (this.state === MuSocketState.CLOSED) {
                    spec.close('cannot reopen closed socket');
                    return;
                }

                this.state = MuSocketState.OPEN;

                this._onMessage = spec.message;
                this._onClose = spec.close;

                spec.ready();
            },
            0);
    }

    private _pendingUnreliableMessages:PendingMessage[] = [];
    private _drainUnreliable = () => {
        if (this.state !== MuSocketState.OPEN) {
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

    private _pendingMessages:PendingMessage[] = [];
    private _drainTimeout;
    private _drain = () => {
        // assuming timeout IDs always positive
        // indicate the draining task has been carried out
        this._drainTimeout = 0;

        if (this.state !== MuSocketState.OPEN) {
            return;
        }

        for (let i = 0; i < this._pendingMessages.length; ++i) {
            const message = this._pendingMessages[i];
            if (typeof message === 'string') {
                this._duplex._onMessage(message, false);
            } else {
                this._duplex._onMessage(message.bytes, false);
                message.free();
            }
        }
        this._pendingMessages.length = 0;
    }

    // draining reliable messages is scheduled only when no draining tasks are waiting,
    // to ensure messages are handled in correct order
    // while scheduling of draining unreliable message happen whenever one is "sent"
    // and they are "drained" one at a time, no handling order guaranteed
    public send (data_:MuData, unreliable?:boolean) {
        if (this.state === MuSocketState.CLOSED) {
            return;
        }

        const data = typeof data_ === 'string' ? data_ : new BufferWrapper(data_);
        if (unreliable) {
            this._pendingUnreliableMessages.push(data);
            setTimeout(this._drainUnreliable, 0);
        } else {
            this._pendingMessages.push(data);
            // if no awaiting draining task
            if (!this._drainTimeout) {
                this._drainTimeout = setTimeout(this._drain, 0);
            }
        }
    }

    public close () {
        if (this.state !== MuSocketState.OPEN) {
            return;
        }

        this.state = MuSocketState.CLOSED;

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

    private _started = false;
    private _closed = false;
    public open = false;

    private _onConnection:MuConnectionHandler;
    private _onClose:MuCloseHandler;

    // should only be used in this module
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

    // should only be used in this module
    public _removeSocket (socket) {
        removeIfExists(this.clients, socket);
        removeIfExists(this._pendingSockets, socket);
    }

    public start (spec:MuSocketServerSpec) {
        setTimeout(
            () => {
                if (this._closed) {
                    spec.close('cannot start closed socket server');
                    return;
                }
                if (this._started) {
                    spec.close('socket server already started');
                    return;
                }

                this._started = true;
                this.open = true;

                this._onConnection = spec.connection;
                this._onClose = spec.close;

                spec.ready();

                // _pendingSockets -> clients
                while (this._pendingSockets.length > 0) {
                    this._handleConnection(this._pendingSockets.pop());
                }
            },
            0);
    }

    public close () {
        if (!this._started || this._closed) {
            return;
        }

        this._closed = true;
        this.open = false;

        for (let i = this.clients.length - 1; i >= 0; --i) {
            this.clients[i].close();
        }
        this._onClose();
    }
}
