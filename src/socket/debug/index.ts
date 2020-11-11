import {
    MuSocketServer,
    MuSocketServerSpec,
    MuSocket,
    MuSocketState,
    MuSocketSpec,
    MuSessionId,
    MuData,
} from '../socket';
import {
    MuBuffer,
    allocBuffer,
    freeBuffer,
} from '../../stream';
import { MuLogger, MuDefaultLogger } from '../../logger';

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
    handler:(data:MuData) => void,
) {
    const message = pendingMessages.shift();
    if (typeof message === 'string') {
        handler(message);
    } else if (message) {
        handler(message.bytes);
        message.free();
    }
}

export class MuDebugSocket implements MuSocket {
    public socket:MuSocket;

    public readonly sessionId:MuSessionId;
    public state() : MuSocketState {
        return this.socket.state();
    }

    public inLatency = 0;
    public inJitter = 0;
    public inPacketLoss = 0;
    public outLatency = 0;
    public outJitter = 0;
    public outPacketLoss = 0;
    public logger:MuLogger;

    constructor (spec:{
        socket:MuSocket,
        inLatency?:number,
        inJitter?:number,
        inPacketLoss?:number,
        outLatency?:number,
        outJitter?:number,
        outPacketLoss?:number,
        logger?:MuLogger,
    }) {
        this.socket = spec.socket;
        this.sessionId = this.socket.sessionId;

        if (typeof spec.inLatency === 'number') {
            this.inLatency = Math.max(0, spec.inLatency);
        }
        if (typeof spec.inJitter === 'number') {
            this.inJitter = Math.max(0, spec.inJitter);
        }
        if (typeof spec.inPacketLoss === 'number') {
            this.inPacketLoss = Math.min(100, Math.max(0, spec.inPacketLoss));
        }
        if (typeof spec.outLatency === 'number') {
            this.outLatency = Math.max(0, spec.outLatency);
        }
        if (typeof spec.outJitter === 'number') {
            this.outJitter = Math.max(0, spec.outJitter);
        }
        if (typeof spec.outPacketLoss === 'number') {
            this.outPacketLoss = Math.min(100, Math.max(0, spec.outPacketLoss));
        }

        this.logger = spec.logger || MuDefaultLogger;
    }

    private _inbox:(string|MuBufferWrapper)[] = [];

    public open (spec:MuSocketSpec) {
        this.socket.open({
            ready: () => {
                try {
                    spec.ready();
                } catch (e) {
                    this.logger.exception(e);
                }
            },
            message: (data, unreliable) => {
                if (unreliable) {
                    if (Math.random() * 100 < this.inPacketLoss) {
                        return;
                    }
                    setTimeout(
                        () => {
                            try {
                                spec.message(data, true);
                            } catch (e) {
                                this.logger.exception(e);
                            }
                        },
                        calcDelay(this.inLatency, this.inJitter),
                    );
                } else {
                    const message = typeof data === 'string' ? data : new MuBufferWrapper(data);
                    this._inbox.push(message);
                    setTimeout(
                        () => {
                            try {
                                drain(
                                    this._inbox,
                                    (data_) => spec.message(data_, false));
                            } catch (e) {
                                this.logger.exception(e);
                            }
                        },
                        calcDelay(this.inLatency, this.inJitter),
                    );
                }
            },
            close: () => {
                try {
                    spec.close();
                } catch (e) {
                    this.logger.exception(e);
                }
            },
        });
    }

    private _outbox:(string|MuBufferWrapper)[] = [];

    public send (data:MuData, unreliable?:boolean) {
        const message = typeof data === 'string' ? data : new MuBufferWrapper(data);
        this._outbox.push(message);

        const unreliable_ = !!unreliable;
        if (unreliable_) {
            if (Math.random() * 100 < this.outPacketLoss) {
                return;
            }
        }

        setTimeout(
            () => drain(
                this._outbox,
                (data_) => {
                    try {
                        this.socket.send(data_, unreliable_);
                    } catch (e) {
                        this.logger.exception(e);
                    }
                },
            ),
            calcDelay(this.outLatency, this.outJitter),
        );
    }

    public close () {
        this.socket.close();
    }

    public reliableBufferedAmount () {
        return this.socket.reliableBufferedAmount();
    }

    public unreliableBufferedAmount () {
        return this.socket.unreliableBufferedAmount();
    }
}

export class MuDebugServer implements MuSocketServer {
    public socketServer:MuSocketServer;
    public state () {
        return this.socketServer.state();
    }

    public clients:MuDebugSocket[] = [];

    public inLatency:number;
    public inJitter:number;
    public inPacketLoss:number;
    public outLatency:number;
    public outJitter:number;
    public outPacketLoss:number;

    public logger:MuLogger;

    constructor (spec:{
        socketServer:MuSocketServer,
        inLatency?:number,
        inJitter?:number,
        inPacketLoss?:number,
        outLatency?:number,
        outJitter?:number,
        outPacketLoss?:number,
        logger?:MuLogger,
    }) {
        this.socketServer = spec.socketServer;

        this.inLatency = spec.inLatency || 0;
        this.inJitter = spec.inJitter || 0;
        this.inPacketLoss = spec.inPacketLoss || 0;
        this.outLatency = spec.outLatency || 0;
        this.outJitter = spec.outJitter || 0;
        this.outPacketLoss = spec.outPacketLoss || 0;

        this.logger = spec.logger || MuDefaultLogger;
    }

    public start (spec:MuSocketServerSpec) {
        this.socketServer.start({
            ready: () => {
                try {
                    spec.ready();
                } catch (e) {
                    this.logger.exception(e);
                }
            },
            connection: (socket) => {
                const client = new MuDebugSocket({
                    socket,
                    inLatency: this.inLatency,
                    inJitter: this.inJitter,
                    inPacketLoss: this.inPacketLoss,
                    outLatency: this.outLatency,
                    outJitter: this.outJitter,
                    outPacketLoss: this.outPacketLoss,
                });
                this.clients.push(client);
                try {
                    spec.connection(client);
                } catch (e) {
                    this.logger.exception(e);
                }
            },
            close: () => {
                try {
                    spec.close();
                } catch (e) {
                    this.logger.exception(e);
                }
            },
        });
    }

    public close () {
        this.socketServer.close();
    }
}
