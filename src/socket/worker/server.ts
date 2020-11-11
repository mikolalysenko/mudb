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
} from '../socket';
import { MuScheduler } from '../../scheduler/scheduler';
import { MuSystemScheduler } from '../../scheduler/system';

function noop () { }

class MuWorkerServerSocket implements MuSocket {
    private _state = MuSocketState.INIT;
    public sessionId:MuSessionId;
    public state () { return this._state; }

    // a DedicatedWorkerGlobalScope object
    private _socket;

    private _onclose:MuCloseHandler = noop;

    public scheduler:MuScheduler;

    constructor (sessionId:MuSessionId, socket, scheduler?:MuScheduler) {
        this.sessionId = sessionId;
        this._socket = socket;
        this.scheduler = scheduler || MuSystemScheduler;
    }

    public open (spec:MuSocketSpec) {
        if (this._state === MuSocketState.OPEN) {
            throw new Error('server-side Worker socket already open');
        }
        if (this._state === MuSocketState.CLOSED) {
            throw new Error('server-side Worker socket already closed, cannot reopen');
        }

        this.scheduler.setTimeout(
            () => {
                this._state = MuSocketState.OPEN;

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
        if (this._state !== MuSocketState.OPEN) {
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
        if (this._state !== MuSocketState.OPEN) {
            this._state = MuSocketState.CLOSED;
            return;
        }

        this._state = MuSocketState.CLOSED;
        this._socket.close();
        this._onclose();
    }

    public reliableBufferedAmount () {
        return 0;
    }

    public unreliableBufferedAmount () {
        return 0;
    }
}

export class MuWorkerSocketServer implements MuSocketServer {
    private _state = MuSocketServerState.INIT;
    public state () { return this._state; }

    private _pendingSockets:MuSocket[] = [];
    public clients:MuSocket[] = [];

    private _onconnection:MuConnectionHandler = noop;
    private _onclose:MuCloseHandler = noop;

    public scheduler:MuScheduler;

    constructor (scheduler?:MuScheduler) {
        this.scheduler = scheduler || MuSystemScheduler;
    }

    private _handleConnection (socket) {
        switch (this._state) {
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
        if (this._state === MuSocketServerState.RUNNING) {
            throw new Error('Worker socket server already running');
        }
        if (this._state === MuSocketServerState.SHUTDOWN) {
            throw new Error('Worker socket server already shut down, cannot restart');
        }

        this.scheduler.setTimeout(
            () => {
                this._state = MuSocketServerState.RUNNING;

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
        if (this._state !== MuSocketServerState.RUNNING) {
            this._state = MuSocketServerState.SHUTDOWN;
            return;
        }

        this._state = MuSocketServerState.SHUTDOWN;

        for (let i = this.clients.length - 1; i >= 0; --i) {
            this.clients[i].close();
        }
        this._onclose();
    }
}

export function createWorkerSocketServer () {
    return new MuWorkerSocketServer();
}
