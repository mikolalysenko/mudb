import uWS = require('uWebSockets.js');
import qs = require('querystring');
import {
    MuSocket, MuSocketState, MuSocketSpec,
    MuSocketServer, MuSocketServerState, MuSocketServerSpec,
    MuSessionId, MuData, MuCloseHandler, MuMessageHandler,
} from '../socket';
import { decodeUTF8 } from '../../stream/index';
import { MuScheduler, MuSystemScheduler } from '../../scheduler/index';
import { MuLogger, MuDefaultLogger } from '../../logger';

function noop () { }

const filename = '[mudb/socket/uws/server]';

export class MuUWSSocketConnection {
    public readonly sessionId:MuSessionId;

    public opened = false;
    public closed = false;

    private _reliableSocket:uWS.WebSocket;
    private _unreliableSockets:uWS.WebSocket[] = [];
    private _pendingMessages:MuData[] = [];

    public onMessage:MuMessageHandler = noop;
    public onClose:() => void = noop;
    public cleanUp:() => void;

    private _bufferLimit:number;
    private _logger:MuLogger;

    constructor (
        sessionId:MuSessionId,
        socket:uWS.WebSocket,
        bufferLimit:number,
        logger:MuLogger,
        cleanUp:() => void,
    ) {
        this.sessionId = sessionId;
        this._reliableSocket = socket;
        this._bufferLimit = bufferLimit;
        this._logger = logger;
        this.cleanUp = cleanUp;

        socket.onMessage = (msg:MuData) => {
            if (!this.closed) {
                const msg_ = typeof msg === 'string' ? msg : msg.slice(0);
                this._pendingMessages.push(msg_);
            }
        };
        socket.onClose = (code, codeMsg) => {
            if (code > 1001) {
                this._logger.error(`${filename} - reliable socket ${this.sessionId} closed unexpectedly${codeMsg}`);
            }

            this.closed = true;
            for (let i = 0; i < this._unreliableSockets.length; ++i) {
                this._unreliableSockets[i].end(code, 'Reliable Socket Is Closed');
            }
            this._unreliableSockets.length = 0;
            this.onClose();
            this.cleanUp();
        };
    }

    public addUnreliable (socket:uWS.WebSocket) {
        if (this.closed) {
            return;
        }

        this._unreliableSockets.push(socket);
        socket.onMessage = (msg) => {
            if (!this.closed) {
                this.onMessage(msg, true);
            }
        };
        socket.onClose = (code, codeMsg) => {
            if (!this.closed) {
                this._logger.error(`${filename} - unreliable socket ${this.sessionId} closed unexpectedly${codeMsg}`);
            }
            const idx = this._unreliableSockets.indexOf(socket);
            if (idx > -1) {
                this._unreliableSockets.splice(idx, 1);
            }
        };
    }

    public open () {
        if (!this.opened && !this.closed) {
            this.opened = true;

            for (let i = 0; i < this._pendingMessages.length; ++i) {
                this.onMessage(this._pendingMessages[i], false);
            }
            this._pendingMessages.length = 0;

            this._reliableSocket.onMessage = (msg) => {
                this.onMessage(msg, false);
            };
        }
    }

    public send (data:MuData, unreliable:boolean) {
        if (this.closed) {
            return;
        }

        const isBinary = typeof data !== 'string';
        if (unreliable) {
            const sockets = this._unreliableSockets;
            const length = sockets.length;

            if (length > 0) {
                let idx = 0;
                let socket = sockets[0];
                let bufferedAmount = socket.getBufferedAmount();
                for (let i = 1; i < length; ++i) {
                    const s = sockets[i];
                    const b = s.getBufferedAmount();
                    if (bufferedAmount > b) {
                        idx = i;
                        socket = s;
                        bufferedAmount = b;
                    }
                }

                if (bufferedAmount < this._bufferLimit) {
                    socket.send(data, isBinary);
                    sockets.splice(idx, 1);
                    sockets.push(socket);
                }
            }
        } else {
            this._reliableSocket.send(data, isBinary);
        }
    }

    public close () {
        this._reliableSocket.end(1001, 'Closing Server');
    }
}

export class MuUWSSocketClient implements MuSocket {
    public readonly sessionId:MuSessionId;

    private _state = MuSocketState.INIT;
    public state () : MuSocketState {
        return this._state;
    }

    private _connection:MuUWSSocketConnection;

    private _scheduler:MuScheduler;
    private _logger:MuLogger;

    constructor (
        connection:MuUWSSocketConnection,
        scheduler:MuScheduler,
        logger:MuLogger,
    ) {
        this._connection = connection;
        this.sessionId = connection.sessionId;
        this._scheduler = scheduler;
        this._logger = logger;
    }

    public open (spec:MuSocketSpec) {
        if (this._state === MuSocketState.OPEN) {
            throw new Error(`${filename} - socket already open`);
        }
        if (this._state === MuSocketState.CLOSED) {
            throw new Error(`${filename} - socket already closed, cannot reopen`);
        }

        this._scheduler.setTimeout(() => {
            if (this._connection.closed) {
                this._state = MuSocketState.CLOSED;
                spec.close();
                return;
            }

            this._state = MuSocketState.OPEN;
            spec.ready();

            this._connection.onMessage = spec.message;
            this._connection.onClose = () => {
                this._state = MuSocketState.CLOSED;
                spec.close();
            };
            this._connection.open();
        }, 0);
    }

    public send (data:MuData, unreliable?:boolean) {
        this._connection.send(data, !!unreliable);
    }

    public close () {
        if (this._state !== MuSocketState.CLOSED) {
            this._state = MuSocketState.CLOSED;
            this._connection.close();
        }
    }
}

export class MuUWSSocketServer implements MuSocketServer {
    private _state = MuSocketServerState.INIT;
    public state () : MuSocketServerState {
        return this._state;
    }

    private _server:uWS.TemplatedApp;
    private _bufferLimit:number;
    private _idleTimeout:number;
    private _path:string;

    public clients:MuUWSSocketClient[] = [];
    private _connections:MuUWSSocketConnection[] = [];

    private _onClose:MuCloseHandler = noop;

    private _scheduler:MuScheduler;
    private _logger:MuLogger;

    constructor (spec:{
        server:uWS.TemplatedApp,
        bufferLimit?:number
        idleTimeout?:number,
        path?:string,
        scheduler?:MuScheduler,
        logger?:MuLogger,
    }) {
        this._server = spec.server;
        this._bufferLimit = spec.bufferLimit || 1024;
        this._idleTimeout = spec.idleTimeout || 0;
        this._path = spec.path || '/*';
        this._scheduler = spec.scheduler || MuSystemScheduler;
        this._logger = spec.logger || MuDefaultLogger;
    }

    private _findConnection (sessionId:MuSessionId) {
        for (let i = this._connections.length - 1; i >= 0; --i) {
            const conn = this._connections[i];
            if (conn.sessionId === sessionId) {
                return conn;
            }
        }
        return null;
    }

    public start (spec:MuSocketServerSpec) {
        if (this._state === MuSocketServerState.RUNNING) {
            throw new Error(`${filename} - socket server already running`);
        }
        if (this._state === MuSocketServerState.SHUTDOWN) {
            throw new Error(`${filename} - socket server already shut down, cannot restart`);
        }

        this._scheduler.setTimeout(() => {
            if (this._state !== MuSocketServerState.INIT) {
                return;
            }

            this._server.ws(this._path, {
                idleTimeout: this._idleTimeout,

                upgrade: (res, req, context) => {
                    // the only way to pass user data to 'open' event
                    res.upgrade(
                        qs.parse(req.getQuery()),
                        req.getHeader('sec-websocket-key'),
                        req.getHeader('sec-websocket-protocol'),
                        req.getHeader('sec-websocket-extensions'),
                        context,
                    );
                },
                open: (socket) => {
                    const sessionId = socket.sid;
                    if (typeof sessionId !== 'string') {
                        socket.end(1008, `No session Id`);
                        this._logger.error(`${filename} - killing connection due to lack of session id`);
                        return;
                    }

                    let conn = this._findConnection(sessionId);
                    if (conn) {
                        socket.send(JSON.stringify({ reliable: false }));
                        conn.addUnreliable(socket);
                    } else {
                        socket.send(JSON.stringify({ reliable: true }));
                        conn = new MuUWSSocketConnection(
                            sessionId,
                            socket,
                            this._bufferLimit,
                            this._logger,
                            () => {
                                if (conn) {
                                    const idx = this._connections.indexOf(conn);
                                    if (idx > -1) {
                                        this._connections.splice(idx, 1);
                                        for (let i = 0; i < this.clients.length; ++i) {
                                            if (this.clients[i].sessionId === conn.sessionId) {
                                                this.clients.splice(i, 1);
                                            }
                                        }
                                    }
                                }
                            },
                        );
                        const client = new MuUWSSocketClient(conn, this._scheduler, this._logger);
                        this._connections.push(conn);
                        this.clients.push(client);
                        spec.connection(client);
                    }
                },
                message: (socket, data, isBinary) => {
                    if (socket.onMessage) {
                        const bytes = new Uint8Array(data);
                        const msg = isBinary ? bytes : decodeUTF8(bytes);
                        socket.onMessage(msg);
                    }
                },
                close: (socket, code, message) => {
                    function codeMessage () {
                        let ret = '';
                        code && (ret += code);
                        const msg = decodeUTF8(new Uint8Array(message));
                        msg && (ret += ' ' + msg);
                        ret && (ret = ': ' + ret);
                        return ret;
                    }

                    if (socket.onClose) {
                        socket.onClose(code, codeMessage());
                    }
                },
            });

            this._onClose = spec.close;
            this._state = MuSocketServerState.RUNNING;
            spec.ready();
        }, 0);
    }

    public close () {
        if (this._state !== MuSocketServerState.SHUTDOWN) {
            this._state = MuSocketServerState.SHUTDOWN;

            for (let i = 0; i < this.clients.length; ++i) {
                this.clients[i].close();
            }
            this.clients.length = 0;
            this._connections.length = 0;
            this._onClose();
        }
    }
}
