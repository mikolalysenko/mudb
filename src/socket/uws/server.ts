import querystring = require('querystring');
import { Buffer } from 'buffer';

import uWS = require('uWebSockets.js');

import {
    MuData, MuMessageHandler, MuCloseHandler,
    MuSocket, MuSocketState, MuSocketSpec,
    MuSocketServer, MuSocketServerState, MuSocketServerSpec,
} from '../socket';
import { MuScheduler } from '../../scheduler/scheduler';
import { MuSystemScheduler } from '../../scheduler/system';

function noop () { }

export class MuUWSSocketClient implements MuSocket {
    public state = MuSocketState.INIT;

    public readonly sessionId:string;

    public _reliableSocket:uWS.WebSocket;
    public _unreliableSockets:uWS.WebSocket[] = [];
    private _nextUnreliable = 0;
    public _pendingMessages:MuData[] = [];

    public _scheduler:MuScheduler;
    public _onmessage:MuMessageHandler = noop;
    public _onclose:MuCloseHandler = noop;

    constructor (
        sessionId:string,
        reliableSocket:uWS.WebSocket,
        scheduler:MuScheduler,
        onclientclose:() => void,
    ) {
        this.sessionId = sessionId;
        this._reliableSocket = reliableSocket;
        this._scheduler = scheduler;

        this._reliableSocket.onmessage = (msg:MuData) => {
            const msg_ = typeof msg === 'string' ? msg : msg.slice(0);
            this._pendingMessages.push(msg_);
        };
        this._reliableSocket.onclose = () => {
            this.state = MuSocketState.CLOSED;
            for (let i = 0; i < this._unreliableSockets.length; ++i) {
                this._unreliableSockets[i].close();
            }
            this._onclose();
            onclientclose();
        };
    }

    public _addUnreliable (socket:uWS.WebSocket) {
        if (this.state === MuSocketState.CLOSED) {
            return;
        }

        socket.onmessage = (msg:MuData) => {
            this._onmessage(msg, true);
        };
        socket.onclose = () => {
            this._unreliableSockets.splice(this._unreliableSockets.indexOf(socket), 1);
        };
        this._unreliableSockets.push(socket);
    }

    public open (spec:MuSocketSpec) {
        if (this.state !== MuSocketState.INIT) {
            throw new Error(`socket had already been opened [mudb/socket/web/server]`);
        }

        this._scheduler.setTimeout(() => {
            this._onmessage = spec.message;
            this._onclose = spec.close;
            this._reliableSocket.onmessage = (msg:MuData) => {
                this._onmessage(msg, false);
            };

            // order matters
            this.state = MuSocketState.OPEN;
            spec.ready();

            for (let i = 0; i < this._pendingMessages.length; ++i) {
                this._onmessage(this._pendingMessages[i], false);
            }
            this._pendingMessages.length = 0;
        }, 0);
    }

    public send (data:MuData, unreliable?:boolean) {
        if (this.state !== MuSocketState.OPEN) {
            return;
        }

        const isBinary = typeof data !== 'string';
        if (unreliable) {
            const numUnreliable = this._unreliableSockets.length;
            if (numUnreliable > 0) {
                this._unreliableSockets[this._nextUnreliable++ % numUnreliable].send(data, isBinary);
            }
        } else {
            this._reliableSocket.send(data, isBinary);
        }
    }

    public close () {
        if (this.state === MuSocketState.CLOSED) {
            return;
        }

        this.state = MuSocketState.CLOSED;
        this._reliableSocket.close();
        for (let i = 0; i < this._unreliableSockets.length; ++i) {
            this._unreliableSockets[i].close();
        }
    }
}

export class MuUWSSocketServer implements MuSocketServer {
    public state = MuSocketServerState.INIT;

    public clients:MuUWSSocketClient[] = [];

    private _server:uWS.TemplatedApp;
    private _listenSocket:uWS.us_listen_socket|null = null;
    private _onclose:MuCloseHandler = noop;

    private _scheduler:MuScheduler;

    constructor (spec:{
        server:uWS.TemplatedApp,
        scheduler?:MuScheduler,
    }) {
        this._server = spec.server;
        this._scheduler = spec.scheduler || MuSystemScheduler;
    }

    private _findClient (sessionId:string) : MuUWSSocketClient|null {
        for (let i = this.clients.length - 1; i >= 0; --i) {
            if (this.clients[i].sessionId === sessionId) {
                return this.clients[i];
            }
        }
        return null;
    }

    public start (spec:MuSocketServerSpec) {
        if (this.state !== MuSocketServerState.INIT) {
            throw new Error(`server had already been started [mudb/socket/web/server]`);
        }

        this._scheduler.setTimeout(() => {
            this._server.ws('/*', {
                open: (socket, req) => {
                    const sessionId = querystring.parse(req.getQuery()).sid;
                    if (typeof sessionId !== 'string') {
                        socket.end(1008, `no session id`);
                        return;
                    }

                    socket.onmessage = noop;
                    socket.onclose = noop;

                    // first open socket of client deemed to be reliable
                    let client = this._findClient(sessionId);
                    if (client) {
                        socket.send(JSON.stringify({
                            reliable: false,
                        }), false);

                        client._addUnreliable(socket);
                    } else {
                        socket.send(JSON.stringify({
                            reliable: true,
                        }), false);

                        client = new MuUWSSocketClient(sessionId, socket, this._scheduler, () => {
                            if (client) {
                                const idx = this.clients.indexOf(client);
                                if (idx >= 0) {
                                    this.clients.splice(idx, 1);
                                }
                            }
                        });
                        spec.connection(client);
                        this.clients.push(client);
                    }
                },
                message: (socket, message, isBinary) => {
                    const message_ = isBinary ? new Uint8Array(message) : Buffer.from(message).toString();
                    socket.onmessage(message_);
                },
                close: (socket) => {
                    socket.onclose();
                },
            });

            this._onclose = spec.close;
            this.state = MuSocketServerState.RUNNING;
            spec.ready();
        }, 0);
    }

    public listen (spec:{
        port:number,
        host?:string,
        listening?:(listenSocket:uWS.us_listen_socket) => void,
    }) {
        const onlistening = (ls:uWS.us_listen_socket) => {
            if (ls) {
                console.log(`server listening to port ${spec.port}...`);
                this._listenSocket = ls;
                if (spec.listening) {
                    spec.listening(ls);
                }
            } else {
                console.error(`server failed to listen to port ${spec.port}`);
            }
        };

        if (spec.host) {
            this._server.listen(spec.host, spec.port, onlistening);
        } else {
            this._server.listen(spec.port, onlistening);
        }
    }

    public close () {
        if (this.state === MuSocketServerState.SHUTDOWN) {
            return;
        }
        if (this.state === MuSocketServerState.INIT) {
            console.warn(`shutting down socket server before fully started [mudb/socket/uws/server]`);
        }

        this.state = MuSocketServerState.SHUTDOWN;

        if (this._listenSocket) {
            uWS.us_listen_socket_close(this._listenSocket);
        }
        for (let i = 0; i < this.clients.length; ++i) {
            this.clients[i].close();
        }
        this._listenSocket = null;
        this.clients.length = 0;

        this._onclose();
    }
}
