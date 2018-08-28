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
import {
    MuBuffer,
    allocBuffer,
    freeBuffer,
} from 'mustreams';

class MuBufferWrapper {
    private _buffer:MuBuffer;
    public bytes:Uint8Array;

    constructor (bytes:Uint8Array) {
        this._buffer = allocBuffer(bytes.length);
        this.bytes = this._buffer.uint8.subarray(0, bytes.length);
        this.bytes.set(bytes);
    }

    public free () {
        freeBuffer(this._buffer);
    }
}

function calcDelay (latency:number, jitter:number) {
    return latency + Math.floor(Math.random() * jitter);
}

function drain (
    pendingMessages:(string|MuBufferWrapper)[],
    handle:(data:MuData, unreliable:boolean) => void,
) {
    for (let i = 0; i < pendingMessages.length; ++i) {
        const message = pendingMessages[i];
        if (typeof message === 'string') {
            handle(message, false);
        } else {
            handle(message.bytes, false);
            message.free();
        }
    }

    pendingMessages.length = 0;
}

export class MuDebugSocket implements MuSocket {
    public socket:MuSocket;

    public readonly sessionId:MuSessionId;
    public state = MuSocketState.INIT;

    public inLatency = 0;
    public inJitter = 0;
    public outLatency = 0;
    public outJitter = 0;

    constructor (spec:{
        socket:MuSocket,
        inLatency?:number,
        inJitter?:number,
        outLatency?:number,
        outJitter?:number,
    }) {
        this.socket = spec.socket;
        this.sessionId = this.socket.sessionId;

        if (typeof spec.inLatency === 'number') {
            this.inLatency = Math.max(0, spec.inLatency);
        }
        if (typeof spec.inJitter === 'number') {
            this.inJitter = Math.max(0, spec.inJitter);
        }
        if (typeof spec.outLatency === 'number') {
            this.outLatency = Math.max(0, spec.outLatency);
        }
        if (typeof spec.outJitter === 'number') {
            this.outJitter = Math.max(0, spec.outJitter);
        }
    }

    private _drainInboxTimeout;
    private _inbox:(string|MuBufferWrapper)[] = [];

    public open (spec:MuSocketSpec) {
        this.socket.open({
            ready: spec.ready,
            message: (data, unreliable) => {
                if (unreliable) {
                    setTimeout(
                        () => spec.message(data, true),
                        calcDelay(this.inLatency, this.inJitter),
                    );
                } else {
                    const message = typeof data === 'string' ? data : new MuBufferWrapper(data);
                    this._inbox.push(message);

                    if (!this._drainInboxTimeout) {
                        this._drainInboxTimeout = setTimeout(
                            () => {
                                this._drainInboxTimeout = 0;
                                drain(this._inbox, spec.message);
                            },
                            calcDelay(this.inLatency, this.inJitter),
                        );
                    }
                }
            },
            close: spec.close,
        });
    }

    private _drainOutboxTimeout;
    private _outbox:(string|MuBufferWrapper)[] = [];

    public send (data:MuData, unreliable?:boolean) {
        if (unreliable) {
            setTimeout(
                () => this.socket.send(data, true),
                calcDelay(this.outLatency, this.outJitter),
            );
        } else {
            const message = typeof data === 'string' ? data : new MuBufferWrapper(data);
            this._outbox.push(message);

            if (!this._drainOutboxTimeout) {
                this._drainOutboxTimeout = setTimeout(
                    () => {
                        this._drainOutboxTimeout = 0;
                        drain(
                            this._outbox,
                            (data_, unreliable_) => this.socket.send(data_, unreliable_),
                        );
                    },
                    calcDelay(this.outLatency, this.outJitter),
                );
            }
        }
    }

    public close () {
        this.socket.close();
    }
}

export class MuDebugServer implements MuSocketServer {
    public socketServer:MuSocketServer;

    public state = MuSocketServerState.INIT;
    public clients:MuDebugSocket[] = [];

    public inLatency:number;
    public inJitter:number;
    public outLatency:number;
    public outJitter:number;

    constructor (spec:{
        socketServer:MuSocketServer,
        inLatency?:number,
        inJitter?:number,
        outLatency?:number,
        outJitter?:number,
    }) {
        this.socketServer = spec.socketServer;

        this.inLatency = spec.inLatency || 0;
        this.inJitter = spec.inJitter || 0;
        this.outLatency = spec.outLatency || 0;
        this.outJitter = spec.outJitter || 0;
    }

    public start (spec:MuSocketServerSpec) {
        this.socketServer.start({
            ready: spec.ready,
            connection: (socket) => {
                const client = new MuDebugSocket({
                    socket,
                    inLatency: this.inLatency,
                    inJitter: this.inJitter,
                    outLatency: this.outLatency,
                    outJitter: this.outJitter,
                });
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
