import uWS = require('uWebSockets.js');
import qs = require('querystring');
import util = require('util');
import {
    MuSocket, MuSocketState, MuSocketSpec,
    MuSocketServer, MuSocketServerState, MuSocketServerSpec,
    MuSessionId, MuData, MuCloseHandler, MuMessageHandler,
} from '../socket';
import { MuScheduler, MuSystemScheduler } from '../../scheduler/index';
import { MuLogger, MuDefaultLogger } from '../../logger';

function noop () { }

const decoder = new util.TextDecoder();
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

    private _logger:MuLogger;

    constructor (
        sessionId:MuSessionId,
        socket:uWS.WebSocket,
        cleanUp:() => void,
        logger:MuLogger,
    ) {
        this.sessionId = sessionId;
        this._reliableSocket = socket;
        this.cleanUp = cleanUp;
        this._logger = logger;

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
                this._unreliableSockets[i].close();
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

    private _nextUnreliable = 0;
    public send (data:MuData, unreliable:boolean) {
        if (this.closed) {
            return;
        }

        const isBinary = typeof data !== 'string';
        if (unreliable) {
            const sockets = this._unreliableSockets;
            const length = sockets.length;
            if (length > 0) {
                sockets[this._nextUnreliable++ % length].send(data, isBinary);
            }
        } else {
            this._reliableSocket.send(data, isBinary);
        }
    }

    public close () {
        this._reliableSocket.close();
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
        this._scheduler.setTimeout(() => {
            if (this._state === MuSocketState.OPEN) {
                throw new Error(`${filename} - socket already open`);
            }
            if (this._state === MuSocketState.CLOSED) {
                throw new Error(`${filename} - socket already closed, cannot reopen`);
            }
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
    private _idleTimeout:number;
    private _path:string;

    public clients:MuUWSSocketClient[] = [];
    private _connections:MuUWSSocketConnection[] = [];

    private _onClose:MuCloseHandler = noop;

    private _scheduler:MuScheduler;
    private _logger:MuLogger;

    constructor (spec:{
        server:uWS.TemplatedApp,
        idleTimeout?:number,
        path?:string,
        scheduler?:MuScheduler,
        logger?:MuLogger,
    }) {
        this._server = spec.server;
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
        this._scheduler.setTimeout(() => {
            if (this._state === MuSocketServerState.RUNNING) {
                throw new Error(`${filename} - socket server already running`);
            }
            if (this._state === MuSocketServerState.SHUTDOWN) {
                throw new Error(`${filename} - socket server already shut down, cannot restart`);
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
                        socket.end(1008, `no session id`);
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
                            this._logger,
                        );
                        const client = new MuUWSSocketClient(conn, this._scheduler, this._logger);
                        this._connections.push(conn);
                        this.clients.push(client);
                        spec.connection(client);
                    }
                },
                message: (socket, data, isBinary) => {
                    if (socket.onMessage) {
                        const msg = isBinary ? new Uint8Array(data) : decoder.decode(data);
                        socket.onMessage(msg);
                    }
                },
                close: (socket, code, message) => {
                    function codeMessage () {
                        let ret = '';
                        code && (ret += code);
                        const msg = decoder.decode(message);
                        msg && (ret += ' ' + msg);
                        if (ret) {
                            ret = ': ' + ret;
                        }
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

    private _listenSocket:uWS.us_listen_socket|null = null;
    public listen (port:number, cb:(listenSocket:uWS.us_listen_socket) => void) {
        this._server.listen(port, (token) => {
            if (token) {
                this._listenSocket = token;
                cb(token);
            } else {
                throw new Error(`${filename} - failed to listen to port ${port}`);
            }
        });
    }

    public close () {
        if (this._state !== MuSocketServerState.SHUTDOWN) {
            this._state = MuSocketServerState.SHUTDOWN;

            if (this._listenSocket) {
                uWS.us_listen_socket_close(this._listenSocket);
            }
            for (let i = 0; i < this.clients.length; ++i) {
                this.clients[i].close();
            }
            this._listenSocket = null;
            this.clients.length = 0;
            this._connections.length = 0;
            this._onClose();
        }
    }
}
