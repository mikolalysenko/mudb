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
} from '../../core/socket';

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
        // `self` is a DedicatedWorkerGlobalScope object
        self.onmessage = ({ data }) => {
            if (data.sessionId) {
                this._handleConnection(new MuWorkerServerSocket(data.sessionId, self));
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

class MuWorkerServerSocket implements MuSocket {
    public state = MuSocketState.INIT;
    public sessionId:MuSessionId;

    // a DedicatedWorkerGlobalScope object
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

                // send session id back to client as an ACK
                this._socket.postMessage({ sessionId: this.sessionId });

                spec.ready();
            },
            0,
        );
    }

    public send (message:MuData, unreliable_?:boolean) {
        if (this.state !== MuSocketState.OPEN) {
            return;
        }

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
