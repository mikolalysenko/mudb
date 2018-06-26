import {
    MuSocketServer,
    MuSocketServerState,
    MuSocketServerSpec,
    MuSocket,
    MuSocketState,
    MuSocketSpec,
    MuSessionId,
    MuData,
    MuConnectionHandler,
    MuCloseHandler,
} from 'mudb/socket';
import {
    MuBuffer,
    allocBuffer,
    freeBuffer,
} from 'mustreams';

function noop () { }

export class MuWorkerSocketServer implements MuSocketServer {
    public state = MuSocketServerState.INIT;

    private _pendingSockets:MuSocket[] = [];
    public clients:MuSocket[] = [];

    private _onconnection:MuConnectionHandler = noop;
    private _onclose:MuCloseHandler = noop;

    private _handleConnection (socket) {
        switch (this.state) {
            case MuSocketServerState.RUNNING:
                this._onconnection(socket);
                this.clients.push(socket);
                break;
            case MuSocketServerState.SHUTDOWN:
                socket.close();
                break;
            default:
                this._pendingSockets.push(socket);
        }
    }

    public start (spec:MuSocketServerSpec) {
        if (this.state === MuSocketServerState.RUNNING) {
            throw new Error('Worker socket server already running');
        }
        if (this.state === MuSocketServerState.SHUTDOWN) {
            throw new Error('Worker socket server already shut down, cannot restart');
        }

        setTimeout(
            () => {
                this.state = MuSocketServerState.RUNNING;

                this._onconnection = spec.connection;
                this._onclose = spec.close;

                while (this._pendingSockets.length > 0) {
                    this._handleConnection(this._pendingSockets.pop());
                }

                spec.ready();
            },
            0,
        );
    }

    public listen () {
        self.onmessage = ({ data }) => {
            if (data.sessionId) {
                const serverSocket = new MuWorkerServerSocket(data.sessionId, self);
                this._handleConnection(serverSocket);
            }
        };
        console.log('socket server listening');
    }

    public close () {
        if (this.state !== MuSocketServerState.RUNNING) {
            this.state = MuSocketServerState.SHUTDOWN;
            return;
        }

        this.state = MuSocketServerState.SHUTDOWN;

        for (let i = this.clients.length - 1; i >= 0; --i) {
            this.clients[i].close();
        }
        this._onclose();
    }
}

export function createWorkerSocketServer () {
    return new MuWorkerSocketServer();
}

class MuBufferWrapper {
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

class MuWorkerServerSocket implements MuSocket {
    public state = MuSocketState.INIT;
    public sessionId:MuSessionId;

    private _socket;

    private _onclose:MuCloseHandler = noop;

    constructor (sessionId:MuSessionId, socket) {
        this.sessionId = sessionId;
        this._socket = socket;
    }

    public open (spec:MuSocketSpec) {
        if (this.state === MuSocketState.OPEN) {
            throw new Error('server-side Worker socket already open');
        }
        if (this.state === MuSocketState.CLOSED) {
            throw new Error('server-side Worker socket already closed, cannot reopen');
        }

        setTimeout(
            () => {
                this.state = MuSocketState.OPEN;

                this._socket.onmessage = ({ data }) => {
                    spec.message(data.message, data.unreliable);
                };
                this._onclose = spec.close;

                this._socket.postMessage({ sessionId: this.sessionId });

                spec.ready();
            },
            0,
        );
    }

    public send (data:MuData, unreliable_?:boolean) {
        if (this.state !== MuSocketState.OPEN) {
            return;
        }

        const message = typeof data === 'string' ? data : (new MuBufferWrapper(data)).bytes;
        const unreliable = !!unreliable_;
        if (typeof message === 'string') {
            this._socket.postMessage({
                message,
                unreliable,
            });
        } else {
            this._socket.postMessage(
                {
                    message,
                    unreliable,
                },
                [ message.buffer ],
            );
        }
    }

    public close () {
        if (this.state !== MuSocketState.OPEN) {
            this.state = MuSocketState.CLOSED;
            return;
        }

        this.state = MuSocketState.CLOSED;
        this._socket.close();
        this._onclose();
    }
}
