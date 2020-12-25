import { allocBuffer, freeBuffer, MuBuffer } from '../../stream';
import {
    MuSocket,
    MuSocketSpec,
    MuSocketServer,
    MuSocketServerSpec,
    MuSessionId,
    MuData,
    MuSocketState,
    MuSocketServerState,
    MuMessageHandler,
    MuCloseHandler,
    MuConnectionHandler,
} from '../socket';
import { MuScheduler } from '../../scheduler/scheduler';
import { MuSystemScheduler } from '../../scheduler/system';
import { MuLogger } from '../../logger';

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

    // corresponding socket on the other end of the connection
    // should only be used inside the module
    public _duplex:MuLocalSocket = <any>null;

    private _onMessage:MuMessageHandler = noop;
    private _onClose:MuCloseHandler = noop;

    private _isClientSocket:boolean;
    private _state = MuSocketState.INIT;
    public state () { return this._state; }

    public scheduler:MuScheduler;

    constructor (
        sessionId:string,
        server:MuLocalSocketServer,
        isClientSocket:boolean,
        scheduler:MuScheduler,
    ) {
        this.sessionId = sessionId;
        this._server = server;
        this._isClientSocket = isClientSocket;
        this.scheduler = scheduler;
    }

    public open (spec:MuSocketSpec) {
        this.scheduler.setTimeout(
            () => {
                if (this._state === MuSocketState.OPEN) {
                    this._onClose('socket already open');
                    return;
                }
                if (this._state === MuSocketState.CLOSED) {
                    this._onClose('cannot reopen closed socket');
                    return;
                }

                this._state = MuSocketState.OPEN;

                this._onMessage = spec.message;
                this._onClose = spec.close;

                if (this._isClientSocket) {
                    this._server._handleConnection(this._duplex);
                }

                spec.ready();

                // drain messages *after* ready handler
                this._drain();
                while (this._pendingUnreliableMessages.length) {
                    this._drainUnreliable();
                }
            },
            0);
    }

    private _pendingUnreliableMessages:PendingMessage[] = [];
    private _drainUnreliable = () => {
        if (this._state !== MuSocketState.OPEN) {
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

        if (this._state !== MuSocketState.OPEN) {
            return;
        }
        if (this._duplex._onMessage === noop) {
            this.scheduler.setTimeout(() => this._drain(), 0);
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
        if (this._state === MuSocketState.CLOSED) {
            return;
        }

        const data = typeof data_ === 'string' ? data_ : new BufferWrapper(data_);
        if (unreliable) {
            this._pendingUnreliableMessages.push(data);
            this.scheduler.setTimeout(this._drainUnreliable, 0);
        } else {
            this._pendingMessages.push(data);
            // if no awaiting draining task
            if (!this._drainTimeout) {
                this._drainTimeout = this.scheduler.setTimeout(this._drain, 0);
            }
        }
    }

    public close () {
        if (this._state === MuSocketState.CLOSED) {
            return;
        }

        this._state = MuSocketState.CLOSED;

        this._server._removeSocket(this);
        this._onClose();
        this._duplex.close();
    }

    public reliableBufferedAmount() {
        return 0;
    }

    public unreliableBufferedAmount() {
        return 0;
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

    private _state = MuSocketServerState.INIT;
    public state () { return this._state; }

    private _onConnection:MuConnectionHandler = noop;
    private _onClose:MuCloseHandler = noop;

    constructor (public scheduler:MuScheduler) {}

    // should only be used inside the module
    public _handleConnection (socket) {
        switch (this._state) {
            case MuSocketServerState.RUNNING:
                this.clients.push(socket);
                this._onConnection(socket);
                break;
            case MuSocketServerState.SHUTDOWN:
                socket.close();
                break;
            default:
                this._pendingSockets.push(socket);
        }
    }

    // should only be used inside the module
    public _removeSocket (socket) {
        removeIfExists(this.clients, socket);
        removeIfExists(this._pendingSockets, socket);
    }

    public start (spec:MuSocketServerSpec) {
        this.scheduler.setTimeout(
            () => {
                if (this._state === MuSocketServerState.RUNNING) {
                    this._onClose('local socket server already running');
                    return;
                }
                if (this._state === MuSocketServerState.SHUTDOWN) {
                    this._onClose('local socket server already shut down, cannot restart');
                    return;
                }

                this._state = MuSocketServerState.RUNNING;

                this._onConnection = spec.connection;
                this._onClose = spec.close;

                // _pendingSockets -> clients
                while (this._pendingSockets.length > 0) {
                    this._handleConnection(this._pendingSockets.pop());
                }

                spec.ready();
            },
            0);
    }

    public close () {
        if (this._state === MuSocketServerState.SHUTDOWN) {
            return;
        }
        if (this._state === MuSocketServerState.INIT) {
            this._state = MuSocketServerState.SHUTDOWN;
            return;
        }

        this._state = MuSocketServerState.SHUTDOWN;

        for (let i = this.clients.length - 1; i >= 0; --i) {
            this.clients[i].close();
        }
        this._onClose();
    }
}

export function createLocalSocketServer (spec?:{
    scheduler?:MuScheduler,
    logger?:MuLogger,
}) : MuLocalSocketServer {
    return new MuLocalSocketServer(spec && spec.scheduler || MuSystemScheduler);
}

export function createLocalSocket (spec:{
    sessionId:MuSessionId;
    server:MuLocalSocketServer;
    scheduler?:MuScheduler;
    logger?:MuLogger;
}) : MuLocalSocket {
    const scheduler = spec.scheduler || MuSystemScheduler;

    // manually spawn and relate sockets on both sides
    const clientSocket = new MuLocalSocket(spec.sessionId, spec.server, true, scheduler);
    const serverSocket = new MuLocalSocket(spec.sessionId, spec.server, false, scheduler);
    clientSocket._duplex = serverSocket;
    serverSocket._duplex = clientSocket;

    return clientSocket;
}
