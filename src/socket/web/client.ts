import { MuSocket, MuSocketState, MuSocketSpec, MuSessionId, MuData } from '../socket';

function error (msgOrErr:string|Error) : Error {
    const msg = typeof msgOrErr === 'string' ? msgOrErr : msgOrErr.message;
    return new Error(`${msg} [mudb/socket/web/client]`);
}

const isBrowser = typeof window === 'object' && !!window && window['Object'] === Object;

let WS:typeof WebSocket;
if (isBrowser) {
    WS = window['WebSocket'] || window['MozWebSocket'];
    if (!WS) {
        throw error(`no WebSocket support in browser`);
    }
} else {
    WS = require.call(null, 'ws');
}

export class MuWebSocket implements MuSocket {
    public readonly sessionId:MuSessionId;
    public state = MuSocketState.INIT;

    private _url:string;

    private _reliableSocket:WebSocket|null = null;
    private _unreliableSockets:WebSocket[] = [];
    private _maxSockets:number;
    private _nextUnreliableSend = 0;

    constructor (spec:{
        sessionId:MuSessionId,
        url:string,
        maxSockets?:number,
    }) {
        this.sessionId = spec.sessionId;
        this._url = spec.url;
        this._maxSockets = Math.max(1, spec.maxSockets || 5) | 0;
    }

    public open (spec:MuSocketSpec) {
        if (this.state !== MuSocketState.INIT) {
            throw error(`socket had already been opened`);
        }

        if (isBrowser) {
            window.onbeforeunload = () => {
                this.close();
            };
        }

        const openSocket = () => {
            const socket = new WS(this._url);
            socket.binaryType = 'arraybuffer';

            socket.onopen = () => {
                socket.onmessage = (event) => {
                    if (this.state === MuSocketState.CLOSED) {
                        socket.close();
                        return;
                    }
                    if (typeof event.data !== 'string') {
                        throw error('first message should be a string');
                    }

                    // first message indicates whether socket is reliable
                    if (JSON.parse(event.data).reliable) {
                        socket.onmessage = ({ data }) => {
                            if (this.state !== MuSocketState.OPEN) {
                                return;
                            }

                            if (typeof data === 'string') {
                                spec.message(data, false);
                            } else {
                                spec.message(new Uint8Array(data), false);
                            }
                        };
                        socket.onclose = (ev) => {
                            this._reliableSocket = null;
                            this.close();
                            spec.close(ev);
                        };
                        this._reliableSocket = socket;

                        this.state = MuSocketState.OPEN;
                        spec.ready();
                    } else {
                        socket.onmessage = ({ data }) => {
                            if (this.state !== MuSocketState.OPEN) {
                                return;
                            }

                            if (typeof data === 'string') {
                                spec.message(data, true);
                            } else {
                                spec.message(new Uint8Array(data), true);
                            }
                        };
                        socket.onclose = (ev) => {
                            for (let i = this._unreliableSockets.length - 1; i >= 0; --i) {
                                if (this._unreliableSockets[i] === socket) {
                                    this._unreliableSockets.splice(i, 1);
                                }
                            }
                        };
                        this._unreliableSockets.push(socket);
                    }
                };

                socket.send(JSON.stringify({
                    sessionId: this.sessionId,
                }));
            };
        };

        for (let i = 0; i < this._maxSockets; ++i) {
            openSocket();
        }
    }

    public send (data:MuData, unreliable?:boolean) {
        if (this.state !== MuSocketState.OPEN) {
            return;
        }

        if (unreliable) {
            if (this._unreliableSockets.length > 0) {
                this._unreliableSockets[this._nextUnreliableSend++ % this._unreliableSockets.length].send(data);
            }
        } else if (this._reliableSocket) {
            this._reliableSocket.send(data);
        }
    }

    public close () {
        if (this.state === MuSocketState.CLOSED) {
            return;
        }
        this.state = MuSocketState.CLOSED;

        if (this._reliableSocket) {
            this._reliableSocket.close();
            this._reliableSocket = null;
        }
        for (let i = 0; i < this._unreliableSockets.length; ++i) {
            this._unreliableSockets[i].close();
        }
        this._unreliableSockets.length = 0;
    }
}
