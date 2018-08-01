import {
    MuSocketServer,
    MuSocketServerState,
    MuSocketServerSpec,
    MuSocket,
    MuSocketState,
    MuSocketSpec,
    MuSessionId,
    MuData,
} from 'mudb/socket';

export class MuDebugServerSocket implements MuSocket {
    public socket:MuSocket;
    public readonly sessionId:MuSessionId;

    public state = MuSocketState.INIT;

    public numPackets = 0;

    public configured = false;
    public latency = 0;
    public jitter = 0;

    constructor (spec:{
        socket:MuSocket,
    }) {
        this.socket = spec.socket;
        this.sessionId = spec.socket.sessionId;
    }

    public open (spec) {
        this.socket.open({
            ready: spec.ready,
            message: (data, unreliable) => {
                ++this.numPackets;
                if (this.numPackets !== 1) {
                    spec.message(data, !!unreliable);
                    return;
                }

                if (typeof data === 'string') {
                    try {
                        const condition = JSON.parse(data);
                        this.latency = condition.latency;
                        this.jitter = condition.jitter;
                        this.configured = true;
                    } catch (e) {
                        console.error(e);
                        this.close();
                    }
                }
            },
            close: spec.close,
        });
    }

    public calcDelay () {
        return this.latency + Math.floor(Math.random() * this.jitter);
    }

    private _pendingMessages:MuData[] = [];
    private _drainTimeout;
    private _drainMessages () {
        this._drainTimeout = 0;
        for (let i = 0; i < this._pendingMessages.length; ++i) {
            this.socket.send(this._pendingMessages[i], false);
        }
        this._pendingMessages.length = 0;
    }

    public send (data_:MuData, unreliable?:boolean) {
        const data = typeof data_ === 'string' ? data_ : data_.slice(0);
        if (unreliable) {
            setTimeout(() => this.socket.send(data, true), this.calcDelay());
        } else {
            this._pendingMessages.push(data);

            if (!this.configured) {
                return;
            }

            if (!this._drainTimeout) {
                this._drainTimeout = setTimeout(() => this._drainMessages(), this.calcDelay());
            }
        }
    }

    public close () {
        clearTimeout(this._drainTimeout);
        this.socket.close();
    }
}

export class MuDebugServer implements MuSocketServer {
    public socketServer:MuSocketServer;

    public state = MuSocketServerState.INIT;
    public clients:MuDebugServerSocket[] = [];

    constructor (spec:{
        socketServer:MuSocketServer,
    }) {
        this.socketServer = spec.socketServer;
    }

    public start (spec:MuSocketServerSpec) {
        this.socketServer.start({
            ready: spec.ready,
            connection: (socket) => {
                const client = new MuDebugServerSocket({ socket });
                this.clients.push(client);

                spec.connection(client);
            },
            close: spec.close,
        });
    }

    public close () {
        this.socketServer.close();
    }
}

export class MuDebugSocket implements MuSocket {
    public socket:MuSocket;

    public readonly sessionId:MuSessionId;
    public state = MuSocketState.INIT;

    public latency = 0;
    public jitter = 0;

    constructor (spec:{
        socket:MuSocket,
        latency?:number,
        jitter?:number,
    }) {
        this.socket = spec.socket;
        this.sessionId = this.socket.sessionId;

        if (typeof spec.latency === 'number') {
            this.latency = Math.max(0, spec.latency);
        }
        if (typeof spec.jitter === 'number') {
            this.jitter = Math.max(0, spec.jitter);
        }
    }

    public open (spec:MuSocketSpec) {
        this.socket.open({
            ready: () => {
                this.socket.send(JSON.stringify({
                    latency: this.latency,
                    jitter: this.jitter,
                }));
                spec.ready();
            },
            message: spec.message,
            close: spec.close,
        });
    }

    public send (data:MuData, unreliable?:boolean) {
        this.socket.send(data, !!unreliable);
    }

    public close () {
        this.socket.close();
    }
}
