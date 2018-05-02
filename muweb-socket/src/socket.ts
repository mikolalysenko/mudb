import {
    MuSessionId,
    MuSocketState,
    MuSocket,
    MuSocketSpec,
} from 'mudb/socket';

export class MuWebSocket implements MuSocket {
    public readonly sessionId:MuSessionId;

    public state = MuSocketState.INIT;

    private _url:string;

    private _reliableSocket:WebSocket|null = null;
    private _unreliableSockets:WebSocket[] = [];
    private _maxSockets = 5;

    private _nextSocketSend = 0;

    constructor (spec:{
        sessionId:MuSessionId,
        url:string,
        maxSockets?:number,
    }) {
        this.sessionId = spec.sessionId;
        this._url = spec.url;
        if (spec.maxSockets) {
            this._maxSockets = Math.max(1, spec.maxSockets | 0);
        }
    }

    public open (spec:MuSocketSpec) {
        if (this.state === MuSocketState.OPEN) {
            throw new Error('socket already open');
        }
        if (this.state === MuSocketState.CLOSED) {
            throw new Error('cannot reopen closed socket');
        }

        // used to reliably close sockets
        const sockets:WebSocket[] = [];

        function removeSocket (socket) {
            for (let i = 0; i < sockets.length; ++i) {
                if (sockets[i] === socket) {
                    sockets.splice(i, 1);
                }
            }
        }

        window.addEventListener('beforeunload', () => {
            for (let i = 0; i < sockets.length; ++i) {
                sockets[i].close();
            }
        });

        const openSocket = () => {
            const socket = new WebSocket(this._url);
            socket.binaryType = 'arraybuffer';
            sockets.push(socket);

            // when connection is ready
            socket.onopen = () => {
                socket.onmessage = (ev) => {
                    if (this.state === MuSocketState.CLOSED) {
                        socket.close();
                        return;
                    }

                    if (typeof ev.data === 'string') {
                        // use the first message from server to decide whether this is a reliable socket
                        if (JSON.parse(ev.data).reliable) {
                            this.state = MuSocketState.OPEN;

                            // reset message handler
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
                            socket.onclose = () => {
                                this.state = MuSocketState.CLOSED;

                                // avoid closing socket more than once
                                removeSocket(socket);

                                for (let i = 0; i < sockets.length; ++i) {
                                    sockets[i].close();
                                }

                                spec.close();
                            };
                            this._reliableSocket = socket;

                            spec.ready();
                        } else {
                            // reset message handler
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
                            socket.onclose = () => {
                                // avoid closing socket more than once
                                removeSocket(socket);

                                for (let i = this._unreliableSockets.length - 1; i >= 0; --i) {
                                    if (this._unreliableSockets[i] === socket) {
                                        this._unreliableSockets.splice(i, 1);
                                    }
                                }
                            };
                            this._unreliableSockets.push(socket);
                        }
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

    public send (data:Uint8Array, unreliable?:boolean) {
        if (this.state !== MuSocketState.OPEN) {
            return;
        }

        if (unreliable) {
            if (this._unreliableSockets.length > 0) {
                this._unreliableSockets[this._nextSocketSend++ % this._unreliableSockets.length].send(data);
            }
        } else if (this._reliableSocket) {
            this._reliableSocket.send(data);
        }
    }

    public close () {
        if (this.state !== MuSocketState.OPEN) {
            return;
        }

        // necessary
        this.state = MuSocketState.CLOSED;

        if (this._reliableSocket) {
            this._reliableSocket.close();
        }
        for (let i = 0; i < this._unreliableSockets.length; ++i) {
            this._unreliableSockets[i].close();
        }
    }
}
