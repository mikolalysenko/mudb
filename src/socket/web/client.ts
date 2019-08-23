import { MuSocket, MuSocketState, MuSocketSpec, MuSessionId, MuData } from '../socket';

const isBrowser = typeof window === 'object' && !!window && 'addEventListener' in window;

let browserWS:typeof WebSocket|null = null;
if (isBrowser) {
    browserWS = window['WebSocket'] || window['MozWebSocket'] || null;
}

const GOING_AWAY = 1001;

interface WebSocketConstructor {
    new (url:string, protocols?:string|string[]);
}

export class MuWebSocket implements MuSocket {
    public state = MuSocketState.INIT;

    public readonly sessionId:MuSessionId;

    private _url:string;
    private _ws:WebSocketConstructor;
    private _maxSockets;

    private _reliableSocket:WebSocket|null = null;
    private _unreliableSockets:WebSocket[] = [];
    private _nextUnreliable = 0;

    constructor (spec:{
        sessionId:MuSessionId,
        url:string,
        maxSockets?:number,
        ws?:WebSocketConstructor,
    }) {
        if (isBrowser) {
            if (!browserWS) {
                throw new Error(`no WebSocket support in browser [mudb/socket/web/client]`);
            } else if (spec.ws) {
                console.warn(`Any third-party WebSocket binding will be ignored in browser environment`);
            }
        }
        if (!isBrowser && !spec.ws) {
            throw new Error('specify WebSocket binding via `spec.ws` [mudb/socket/web/client]');
        }
        this._ws = browserWS || <WebSocketConstructor>spec.ws;

        this.sessionId = spec.sessionId;
        this._url = spec.url;
        this._maxSockets = spec.maxSockets ? Math.max(1, spec.maxSockets | 0) : 5;
    }

    public open (spec:MuSocketSpec) {
        if (this.state !== MuSocketState.INIT) {
            throw new Error(`socket had already been opened [mudb/socket/web/client]`);
        }

        if (isBrowser) {
            window.addEventListener('beforeunload', () => {
                if (this._reliableSocket) {
                    this._reliableSocket.close(GOING_AWAY);
                }
                for (let i = 0; i < this._unreliableSockets.length; ++i) {
                    this._unreliableSockets[i].close(GOING_AWAY);
                }
            });
        }

        const openSocket = () => {
            const socket = new this._ws(`${this._url}?sid=${this.sessionId}`);
            socket.binaryType = 'arraybuffer';

            socket.onmessage = (ev) => {
                if (this.state === MuSocketState.CLOSED) {
                    socket.close();
                    return;
                }

                // first message from server determines whether socket should be reliable
                if (JSON.parse(ev.data).reliable) {
                    socket.onmessage = ({ data }) => {
                        if (this.state !== MuSocketState.OPEN) {
                            return;
                        }

                        if (typeof data !== 'string') {
                            spec.message(new Uint8Array(data), false);
                        } else {
                            spec.message(data, false);
                        }
                    };
                    socket.onclose = () => {
                        for (let i = 0; i < this._unreliableSockets.length; ++i) {
                            this._unreliableSockets[i].close();
                        }

                        this.state = MuSocketState.CLOSED;
                        spec.close();
                    };
                    this._reliableSocket = socket;

                    // order matters
                    this.state = MuSocketState.OPEN;
                    spec.ready();
                } else {
                    socket.onmessage = ({ data }) => {
                        if (this.state !== MuSocketState.OPEN) {
                            return;
                        }

                        if (typeof data !== 'string') {
                            spec.message(new Uint8Array(data), true);
                        } else {
                            spec.message(data, true);
                        }
                    };
                    socket.onclose = () => {
                        for (let i = this._unreliableSockets.length - 1; i >= 0; --i) {
                            if (this._unreliableSockets[i] === socket) {
                                this._unreliableSockets.splice(i, 1);
                            }
                        }
                    };

                    this._unreliableSockets.push(socket);
                }
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
            const numUnreliableSockets = this._unreliableSockets.length;
            if (numUnreliableSockets > 0) {
                this._unreliableSockets[this._nextUnreliable++ % numUnreliableSockets].send(data);
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
        }
        for (let i = 0; i < this._unreliableSockets.length; ++i) {
            this._unreliableSockets[i].close();
        }
    }
}
