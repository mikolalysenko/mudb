import {
    MuSocketServer,
    MuSocketState,
    MuSocket,
    MuSocketServerState,
    MuSocketServerSpec,
    MuSessionId,
    MuSocketSpec,
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

    private _onconnection:MuConnectionHandler;
    private _onclose:MuCloseHandler;

    // only use internally
    public _handleConnection (socket) {
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

    public close () {
        if (this.state === MuSocketServerState.SHUTDOWN) {
            return;
        }
        if (this.state === MuSocketServerState.INIT) {
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

export class MuWorkerSocket implements MuSocket {
    public state = MuSocketState.INIT;
    public sessionId:MuSessionId;

    private _duplex;

    private _onclose:MuCloseHandler = noop;

    constructor (sessionId:MuSessionId, duplex) {
        this.sessionId = sessionId;
        this._duplex = duplex;
    }

    public open (spec:MuSocketSpec) {
        if (this.state === MuSocketState.OPEN) {
            throw new Error('client-side Worker socket already open');
        }
        if (this.state === MuSocketState.CLOSED) {
            throw new Error('client-side Worker socket already closed, cannot reopen');
        }

        setTimeout(
            () => {
                this.state = MuSocketState.OPEN;

                this._duplex.onmessage = (ev) => {
                    const message = typeof ev.data.message === 'string' ? ev.data.message : new Uint8Array(ev.data.message);
                    spec.message(message, ev.data.unreliable);
                };

                this._drain();
                while (this._pendingUnreliableMessages.length) {
                    this._drainUnreliable();
                }

                this._onclose = spec.close;
                spec.ready();
            },
            0,
        );
    }

    private _pendingUnreliableMessages:MuData[] = [];
    private _drainUnreliable = () => {
        if (this.state !== MuSocketState.OPEN) {
            return;
        }

        const message = this._pendingUnreliableMessages.pop();
        if (typeof message === 'string') {
            this._duplex.postMessage({
                message,
                unreliable: true,
            });
        } else if (message) {
            this._duplex.postMessage(
                {
                    message: message.buffer,
                    unreliable: true,
                },
                [ message.buffer ],
            );
        }
    }

    private _pendingMessages:MuData[] = [];
    private _drainTimeout = 0;
    private _drain = () => {
        // assuming timeout ids are always positive
        this._drainTimeout = 0;

        if (this.state !== MuSocketState.OPEN) {
            return;
        }

        for (let i = 0; i < this._pendingMessages.length; ++i) {
            const message = this._pendingMessages[i];
            if (typeof message === 'string') {
                this._duplex.postMessage({
                    message,
                    unreliable: false,
                });
            } else {
                this._duplex.postMessage(
                    {
                        message: message.buffer,
                        unreliable: false,
                    },
                    [ message.buffer ],
                );
            }
        }
        this._pendingMessages.length = 0;
    }

    public send (data:MuData, unreliable?:boolean) {
        if (this.state === MuSocketState.CLOSED) {
            return;
        }

        if (unreliable) {
            this._pendingUnreliableMessages.push(data);
            setTimeout(this._drainUnreliable, 0);
        } else {
            this._pendingMessages.push(data);
            // if no awaiting draining task
            if (!this._drainTimeout) {
                this._drainTimeout = self.setTimeout(this._drain, 0);
            }
        }
    }

    public close () {
        if (this.state === MuSocketState.CLOSED) {
            return;
        }
        if (this.state === MuSocketState.INIT) {
            this.state = MuSocketState.CLOSED;
            return;
        }

        this.state = MuSocketState.CLOSED;

        const inWorker = this._duplex.toString() === '[object DedicatedWorkerGlobalScope]';
        if (inWorker) {
            this._duplex.close();
        } else {
            this._duplex.terminate();
        }

        this._onclose();
    }
}
