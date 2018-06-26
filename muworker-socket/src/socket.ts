import {
    MuSocket,
    MuSocketState,
    MuSocketSpec,
    MuCloseHandler,
    MuSessionId,
    MuData,
} from 'mudb/socket';
import {
    MuBuffer,
    allocBuffer,
    freeBuffer,
} from 'mustreams';

function noop () { }

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

type Message = MuBufferWrapper | string;

export class MuWorkerSocket implements MuSocket {
    public state = MuSocketState.INIT;
    public sessionId:MuSessionId;

    private _socket:Worker;

    private _onclose:MuCloseHandler = noop;

    constructor (sessionId:MuSessionId, socket) {
        this.sessionId = sessionId;
        this._socket = socket;

        this._socket.onerror = (ev) => {
            console.error(`${ev.message} (${ev.filename}:${ev.lineno})`);
        };
    }

    public open (spec:MuSocketSpec) {
        if (this.state === MuSocketState.OPEN) {
            throw new Error('client-side Worker socket already open');
        }
        if (this.state === MuSocketState.CLOSED) {
            throw new Error('client-side Worker socket already closed, cannot reopen');
        }

        this.state = MuSocketState.OPEN;

        this._socket.onmessage = (ev) => {
            if (ev.data.sessionId !== this.sessionId) {
                this._socket.terminate();
                throw new Error('invalid session id');
            }

            this._socket.onmessage = ({ data }) => {
                spec.message(data.message, data.unreliable);
            };
            this._onclose = spec.close;

            spec.ready();
        };

        this._socket.postMessage({ sessionId: this.sessionId });
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
        this._socket.terminate();
        this._onclose();
    }
}

export function createWorkerSocket (spec:{
    sessionId:MuSessionId,
    serverWorker:Worker,
}) {
    return new MuWorkerSocket(spec.sessionId, spec.serverWorker);
}
