import { MuSocket, MuSocketState, MuSocketSpec, MuSessionId, MuData } from '../socket';

import makeError = require('../../util/error');
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
    private _logger:MuLogger;

    constructor (spec:{
        sessionId:MuSessionId,
        url:string,
        maxSockets?:number,
        logger?:MuLogger,
    }) {
        this.sessionId = spec.sessionId;
        this._url = spec.url;
        this._maxSockets = Math.max(1, spec.maxSockets || 5) | 0;
        this._logger = spec.logger || MuDefaultLogger;
    }

    private _onError (e) {
        this._logger.error(`websocket error: ${e}`);
    }

    public open (spec:MuSocketSpec) {
        if (this.state !== MuSocketState.INIT) {
            throw error(`socket had been opened`);
        }

        if (isBrowser) {
            window.addEventListener('beforeunload', this.close);
        }

        const self = this;
        function openSocket () {
            const socket = new WS(self._url);
            socket.binaryType = 'arraybuffer';
            socket.onerror = self._onError;

            socket.onopen = function () {
                self._logger.log(`open web socket.  extensions: ${socket.extensions}.  protocol: ${socket.protocol}`);

                // remove handler
                socket.onopen = null;

                if (self.state === MuSocketState.CLOSED) {
                    self._logger.log('socket opened after connection closed');
                    socket.close();
                    return;
                }

                socket.onmessage = function (event) {
                    if (self.state === MuSocketState.CLOSED) {
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
                            if (self.state !== MuSocketState.OPEN) {
                                return;
                            }
                            if (typeof data === 'string') {
                                spec.message(data, false);
                            } else {
                                spec.message(new Uint8Array(data), false);
                            }
                        };
                        socket.onclose = function (ev) {
                            self._logger.log('closing main web socket');
                            self._reliableSocket = null;

                            socket.onmessage = null;
                            socket.onclose = null;
                            socket.onerror = null;

                            self.close();
                            spec.close(ev);
                        };
                        self._reliableSocket = socket;

                        self.state = MuSocketState.OPEN;
                        spec.ready();
                    } else {
                        socket.onmessage = function ({ data }) {
                            if (self.state !== MuSocketState.OPEN) {
                                return;
                            }
                            if (typeof data === 'string') {
                                spec.message(data, true);
                            } else {
                                spec.message(new Uint8Array(data), true);
                            }
                        };
                        socket.onclose = function () {
                            self._logger.log('closing unreliable socket');

                            socket.onmessage = null;
                            socket.onclose = null;
                            socket.onerror = null;

                            const sockets = self._unreliableSockets;
                            for (let i = sockets.length - 1; i >= 0; --i) {
                                if (sockets[i] === socket) {
                                    sockets.splice(i, 1);
                                }
                            }
                            if (self.state !== MuSocketState.CLOSED) {
                                self._logger.log('attempt to reopen unreliable socket');
                                openSocket();
                            }
                        };
                        self._unreliableSockets.push(socket);
                    }
                };

                socket.send(JSON.stringify({
                    sessionId: self.sessionId,
                }));
            };
        }

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

    public close = () => {
        if (this.state === MuSocketState.CLOSED) {
            return;
        }
        this.state = MuSocketState.CLOSED;

        // remove listener
        window.removeEventListener('beforeunload', this.close);

        if (this._reliableSocket) {
            this._reliableSocket.onmessage = null;
            this._reliableSocket.close();
            this._reliableSocket = null;
        }

        // make a copy of unreliable sockets array before closing
        const sockets = this._unreliableSockets.slice();
        for (let i = 0; i < sockets.length; ++i) {
            sockets[i].onmessage = null;
            sockets[i].close();
        }
        this._unreliableSockets.length = 0;
    }
}
