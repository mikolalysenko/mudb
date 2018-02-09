import { MuSessionId, MuSocket, MuSocketSpec } from 'mudb/socket';

export class MuWebSocket implements MuSocket {
    public readonly sessionId:MuSessionId;
    public open:boolean = false;

    private _started:boolean = false;
    private _closed:boolean = false;

    private _url:string;
    private _reliableSocket!:WebSocket;
    private _unreliableSockets:WebSocket[] = [];
    private _maxSockets:number = 5;

    private _lastSocketSend:number = 0;

    constructor (spec:{
        sessionId:MuSessionId,
        url:string,
        maxSockets?:number,
    }) {
        this.sessionId = spec.sessionId;

        // generate query url
        this._url = spec.url;

        if (spec.maxSockets) {
            this._maxSockets = Math.max(1, spec.maxSockets | 0);
        }
    }

    public start(spec:MuSocketSpec) {
        if (this._started) {
            throw new Error('socket already started');
        }
        if (this._closed) {
            throw new Error('socket already closed');
        }
        this._started = true;

        const socketQueue:WebSocket[] = [];

        function removeSocket (socket) {
            for (let i = 0; i < socketQueue.length; ++i) {
                if (socketQueue[i] === socket) {
                    socketQueue.splice(i, 1);
                }
            }
        }

        window.addEventListener('beforeunload', () => {
            for (let i = 0; i < socketQueue.length; ++i) {
                socketQueue[i].close();
            }
        });

        const openSocket = () => {
            const socket = new WebSocket(this._url);
            socket.binaryType = 'arraybuffer';
            socketQueue.push(socket);

            socket.onopen = () => {
                socket.onmessage = (ev) => {
                    if (this._closed) {
                        return socket.close();
                    }
                    const data = ev.data;
                    if (typeof data === 'string') {
                        const info = JSON.parse(data);
                        if (info.reliable) {
                            // allocate reliable socket
                            this.open = true;
                            socket.onmessage = (message) => {
                                if (this.open) {
                                    if (typeof message.data === 'string') {
                                        spec.message(message.data, false);
                                    } else {
                                        spec.message(new Uint8Array(message.data), false);
                                    }
                                }
                            };
                            socket.onclose = () => {
                                this._closed = true;
                                this.open = false;
                                removeSocket(socket);

                                for (let i = 0; i < socketQueue.length; ++i) {
                                    socketQueue[i].close();
                                }
                                spec.close();
                            };
                            this._reliableSocket = socket;
                            spec.ready();
                        } else {
                            // allocate unreliable socket
                            this._unreliableSockets.push(socket);
                            socket.onmessage = (message) => {
                                if (this.open) {
                                    if (typeof message.data === 'string') {
                                        spec.message(message.data, true);
                                    } else {
                                        spec.message(new Uint8Array(message.data), true);
                                    }
                                }
                            };
                            socket.onclose = () => {
                                for (let i = this._unreliableSockets.length - 1; i >= 0; --i) {
                                    if (this._unreliableSockets[i] === socket) {
                                        this._unreliableSockets.splice(i, 1);
                                    }
                                }
                                removeSocket(socket);
                            };
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

    public send(data:Uint8Array, unreliable?:boolean) {
        if (!this.open) {
            return;
        }
        if (unreliable) {
            if (this._unreliableSockets.length > 0) {
                this._unreliableSockets[this._lastSocketSend++ % this._unreliableSockets.length].send(data);
            }
        } else {
            this._reliableSocket.send(data);
        }
    }

    public close() {
        if (this._closed) {
            return;
        }
        this._closed = true;
        if (this._reliableSocket) {
            this._reliableSocket.close();
        }
        for (let i = 0; i < this._unreliableSockets.length; ++i) {
            this._unreliableSockets[i].close();
        }
    }
}
