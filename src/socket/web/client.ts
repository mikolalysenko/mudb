import { MuSocket, MuSocketState, MuSocketSpec, MuSessionId, MuData } from '../socket';

import { makeError } from '../../util/error';
import { MuLogger, MuDefaultLogger } from '../../logger';
const error = makeError('socket/web/client');

const isBrowser = typeof window === 'object' && !!window && window['Object'] === Object;

let WS:typeof WebSocket;
if (isBrowser) {
    WS = window['WebSocket'] || window['MozWebSocket'];
    if (!WS) {
        throw error(`no WebSocket support in browser`);
    }
} else {
    WS = (<any>require).call(null, 'ws');
}

export class MuWebSocket implements MuSocket {
    public readonly sessionId:MuSessionId;
    private _state = MuSocketState.INIT;
    public state () { return this._state; }

    private _url:string;

    private _reliableSocket:WebSocket|null = null;
    private _unreliableSockets:WebSocket[] = [];
    private _maxSockets:number;
    private _logger:MuLogger;

    // if more than bufferLimit bytes are buffered on a websocket, drop unreliable packet
    public bufferLimit:number;

    constructor (spec:{
        sessionId:MuSessionId,
        url:string,
        maxSockets?:number,
        logger?:MuLogger,
        bufferLimit?:number;
    }) {
        this.sessionId = spec.sessionId;
        this._url = spec.url;
        this._maxSockets = Math.max(1, spec.maxSockets || 5) | 0;
        this._logger = spec.logger || MuDefaultLogger;
        this.bufferLimit = spec.bufferLimit || 1024;
    }

    private _onClose = (ev:CloseEvent) => {
        if (!ev.wasClean) {
            this._logger.error(`WebSocket error: ${ev.code} ${ev.reason}`);
        }
    }

    public open (spec:MuSocketSpec) {
        if (this._state !== MuSocketState.INIT) {
            throw error(`socket had been opened`);
        }

        if (isBrowser) {
            window.addEventListener('beforeunload', this.close);
        }

        const self = this;
        function openSocket () {
            const socket = new WS(`${self._url}?sid=${encodeURIComponent(self.sessionId)}`);

            socket.onerror = function (ev) {
                console.error('WebSocket error', ev);
                self._logger.error(`WebSocket error ${ev}`);
            };

            socket.binaryType = 'arraybuffer';

            socket.onopen = function () {
                self._logger.log(`open web socket.  extensions: ${socket.extensions}.  protocol: ${socket.protocol}`);

                // remove handler
                socket.onopen = null;

                if (self._state === MuSocketState.CLOSED) {
                    self._logger.log('socket opened after connection closed');
                    socket.close();
                    return;
                }

                socket.onmessage = function (event) {
                    if (self._state === MuSocketState.CLOSED) {
                        socket.onmessage = null;
                        socket.close();
                        return;
                    }

                    let reliable:boolean;
                    try {
                        if (typeof event.data !== 'string') {
                            throw error('first message should be a string');
                        }
                        reliable = JSON.parse(event.data).reliable;
                    } catch (e) {
                        socket.onmessage = null;
                        self.close();
                        self._logger.error(e);
                        return;
                    }

                    // first message indicates whether socket is reliable
                    if (reliable) {
                        socket.onmessage = function ({ data }) {
                            if (self._state !== MuSocketState.OPEN) {
                                return;
                            }
                            if (typeof data === 'string') {
                                spec.message(data, false);
                            } else {
                                spec.message(new Uint8Array(data), false);
                            }
                        };
                        socket.onclose = function (ev) {
                            self._logger.log('closing reliable socket');
                            self._onClose(ev);

                            self._reliableSocket = null;
                            socket.onmessage = null;
                            socket.onclose = null;

                            self.close();
                            spec.close(ev);
                        };
                        self._reliableSocket = socket;

                        self._state = MuSocketState.OPEN;
                        spec.ready();
                    } else {
                        socket.onmessage = function ({ data }) {
                            if (self._state !== MuSocketState.OPEN) {
                                return;
                            }
                            if (typeof data === 'string') {
                                spec.message(data, true);
                            } else {
                                spec.message(new Uint8Array(data), true);
                            }
                        };
                        socket.onclose = function (ev) {
                            self._logger.log('closing unreliable socket');
                            self._onClose(ev);

                            socket.onmessage = null;
                            socket.onclose = null;

                            const sockets = self._unreliableSockets;
                            for (let i = sockets.length - 1; i >= 0; --i) {
                                if (sockets[i] === socket) {
                                    sockets.splice(i, 1);
                                }
                            }
                            if (self._state !== MuSocketState.CLOSED) {
                                self._logger.log('attempt to reopen unreliable socket');
                                openSocket();
                            }
                        };
                        self._unreliableSockets.push(socket);
                    }
                };
            };
        }

        for (let i = 0; i < this._maxSockets; ++i) {
            openSocket();
        }
    }

    public send (data:MuData, unreliable?:boolean) {
        if (this._state !== MuSocketState.OPEN) {
            return;
        }

        if (unreliable) {
            // select unreliable socket with least amount buffered
            const sockets = this._unreliableSockets;
            if (sockets.length > 0) {
                let socket = sockets[0];
                let bufferedAmount = socket.bufferedAmount || 0;
                let idx = 0;
                for (let i = 1; i < sockets.length; ++i) {
                    const s = sockets[i];
                    const b = s.bufferedAmount || 0;
                    if (b < bufferedAmount) {
                        socket = s;
                        bufferedAmount = b;
                        idx = i;
                    }
                }
                // if buffered amount below cutoff, send a packet
                // otherwise just drop it
                if (bufferedAmount < this.bufferLimit) {
                    socket.send(data);

                    // move socket to back of queue
                    sockets.splice(idx, 1);
                    sockets.push(socket);
                }
            }
        } else if (this._reliableSocket) {
            this._reliableSocket.send(data);
        }
    }

    public close = () => {
        if (this._state === MuSocketState.CLOSED) {
            return;
        }
        this._state = MuSocketState.CLOSED;

        // remove listener
        if (isBrowser) {
            window.removeEventListener('beforeunload', this.close);
        }

        if (this._reliableSocket) {
            this._reliableSocket.onmessage = null;
            this._reliableSocket.close();
            this._reliableSocket = null;
        }

        // make a copy of unreliable sockets array before closing in case onlcose synchronously modifies array
        const sockets = this._unreliableSockets.slice();
        for (let i = 0; i < sockets.length; ++i) {
            sockets[i].onmessage = null;
            sockets[i].close();
        }
        this._unreliableSockets.length = 0;
    }

    public reliableBufferedAmount () {
        if (this._reliableSocket) {
            return this._reliableSocket.bufferedAmount;
        } else {
            return Infinity;
        }
    }

    public unreliableBufferedAmount () {
        let amount = Infinity;
        for (let i = 0; i < this._unreliableSockets.length; ++i) {
            amount = Math.min(amount, this._unreliableSockets[i].bufferedAmount);
        }
        return amount;
    }
}
