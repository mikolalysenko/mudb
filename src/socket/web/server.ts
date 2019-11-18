import ws = require('ws');

import http = require('http');
import https = require('https');

import {
    MuSessionId, MuSocket, MuSocketState, MuSocketSpec,
    MuSocketServer, MuSocketServerState, MuSocketServerSpec,
} from '../socket';
import { MuScheduler } from '../../scheduler/scheduler';
import { MuSystemScheduler } from '../../scheduler/system';

import makeError = require('../../util/error');
import { MuLogger, MuDefaultLogger } from '../../logger';
import { allocBuffer } from '../../stream';
const error = makeError('socket/web/server');

export interface WSSocket {
    onmessage:(message:{ data:Uint8Array|string }) => void;
    onclose:() => void;
    send:(data:Uint8Array|string) => void;
    close:() => void;
}

function noop () { }

export class MuWebSocketConnection {
    public readonly sessionId:string;

    public started = false;
    public closed = false;

    // every client communicates through one reliable and several unreliable sockets
    public reliableSocket:WSSocket;
    public unreliableSockets:WSSocket[] = [];

    private _logger:MuLogger;

    private _nextSocketSend = 0;

    public pendingMessages:(Uint8Array|string)[] = [];

    // for onmessage handler
    public onMessage:(data:Uint8Array|string, unreliable:boolean) => void = noop;

    // both for onclose handler
    public onClose:() => void = noop;
    public serverClose:() => void;

    constructor (sessionId:string, reliableSocket:WSSocket, serverClose:() => void, logger:MuLogger) {
        this.sessionId = sessionId;
        this.reliableSocket = reliableSocket;
        this.serverClose = serverClose;
        this._logger = logger;

        this.reliableSocket.onmessage = ({ data }) => {
            if (this.closed) {
                return;
            }
            if (this.started) {
                this.onMessage(data, false);
            } else {
                if (typeof data === 'string') {
                    this.pendingMessages.push(data);
                } else {
                    this.pendingMessages.push(new Uint8Array(data));
                }
            }
        };
        this.reliableSocket.onclose = () => {
            this.closed = true;

            for (let i = 0; i < this.unreliableSockets.length; ++i) {
                this.unreliableSockets[i].close();
            }

            this.onClose();

            // remove connection from server
            this.serverClose();
        };
    }

    public addUnreliableSocket (socket:WSSocket) {
        if (this.closed) {
            return;
        }

        this.unreliableSockets.push(socket);
        socket.onmessage = ({ data }) => {
            if (this.closed) {
                return;
            }
            if (this.started) {
                this.onMessage(data, true);
            }
        };
        socket.onclose = () => {
            this.unreliableSockets.splice(this.unreliableSockets.indexOf(socket), 1);
            if (!this.closed) {
                this._logger.error(`unreliable socket closed unexpectedly: ${this.sessionId}`);
            }
        };
    }

    public send (data:Uint8Array, unreliable:boolean) {
        if (this.closed) {
            return;
        }
        if (unreliable) {
            if (this.unreliableSockets.length > 0) {
                this.unreliableSockets[this._nextSocketSend++ % this.unreliableSockets.length].send(data);
            }
        } else {
            this.reliableSocket.send(data);
        }
    }

    public close () {
        this.reliableSocket.close();
    }
}

export class MuWebSocketClient implements MuSocket {
    public state = MuSocketState.INIT;
    public readonly sessionId:MuSessionId;

    private _connection:MuWebSocketConnection;
    private _logger:MuLogger;

    public scheduler:MuScheduler;

    constructor (connection:MuWebSocketConnection, scheduler:MuScheduler, logger:MuLogger) {
        this.sessionId = connection.sessionId;
        this._connection = connection;
        this._logger = logger;
        this.scheduler = scheduler;
    }

    public open (spec:MuSocketSpec) {
        if (this.state !== MuSocketState.INIT) {
            throw error(`socket had been opened`);
        }

        this.scheduler.setTimeout(
            () => {
                if (this.state !== MuSocketState.INIT) {
                    return;
                }

                // set state to open
                this.state = MuSocketState.OPEN;

                // fire ready handler
                spec.ready();

                // process all pending messages
                for (let i = 0; i < this._connection.pendingMessages.length; ++i) {
                    if (this._connection.closed) {
                        break;
                    }
                    try {
                        spec.message(this._connection.pendingMessages[i], false);
                    } catch (e) {
                        this._logger.exception(e);
                    }
                }
                this._connection.pendingMessages.length = 0;

                // if socket already closed, then fire close event immediately
                if (this._connection.closed) {
                    this.state = MuSocketState.CLOSED;
                    spec.close();
                } else {
                    // hook started message on socket
                    this._connection.started = true;
                    this._connection.onMessage = spec.message;

                    // hook close handler
                    this._connection.onClose = () => {
                        this.state = MuSocketState.CLOSED;
                        spec.close();
                    };
                }
            },
            0);
    }

    public send (data:Uint8Array, unreliable?:boolean) {
        this._connection.send(data, !!unreliable);
    }

    public close () {
        if (this.state !== MuSocketState.CLOSED) {
            this.state = MuSocketState.CLOSED;
            this._connection.close();
        }
    }
}

export class MuWebSocketServer implements MuSocketServer {
    public state = MuSocketServerState.INIT;

    private _connections:MuWebSocketConnection[] = [];
    public clients:MuWebSocketClient[] = [];

    private _options:object;
    private _wsServer:ws.Server;
    private _logger:MuLogger;

    private _onClose:() => void;

    public scheduler:MuScheduler;

    constructor (spec:{
        server:http.Server|https.Server,
        backlog?:number,
        handleProtocols?:(protocols:any[], request:http.IncomingMessage) => any,
        path?:string,
        perMessageDeflate?:boolean|object,
        maxPayload?:number,
        scheduler?:MuScheduler,
        logger?:MuLogger;
    }) {
        this._logger = spec.logger || MuDefaultLogger;
        this._options = {
            server: spec.server,
            clientTracking: false,
        };
        spec.backlog && (this._options['backlog'] = spec.backlog);
        spec.maxPayload && (this._options['maxPayload'] = spec.maxPayload);
        spec.handleProtocols && (this._options['handleProtocols'] = spec.handleProtocols);
        spec.path && (this._options['path'] = spec.path);
        spec.perMessageDeflate && (this._options['perMessageDeflate'] = spec.perMessageDeflate);
        this.scheduler = spec.scheduler || MuSystemScheduler;
    }

    private _findConnection (sessionId:string) : MuWebSocketConnection | null {
        for (let i = 0; i < this._connections.length; ++i) {
            if (this._connections[i].sessionId === sessionId) {
                return this._connections[i];
            }
        }
        return null;
    }

    public start (spec:MuSocketServerSpec) {
        if (this.state !== MuSocketServerState.INIT) {
            throw error(`server had been started`);
        }

        this.scheduler.setTimeout(
            () => {
                this._wsServer = new ws.Server(this._options)
                .on('connection', (socket) => {
                    if (this.state === MuSocketServerState.SHUTDOWN) {
                        this._logger.error('connection attempt from closed socket server');
                        socket.terminate();
                        return;
                    }

                    this._logger.log('muwebsocket connection received');

                    socket.onmessage = ({ data }) => {
                        try {
                            const sessionId = JSON.parse(data).sessionId;
                            if (typeof sessionId !== 'string') {
                                this._logger.error('invalid session id');
                                return;
                            }

                            let connection = this._findConnection(sessionId);
                            if (connection) {
                                socket.send(JSON.stringify({
                                    reliable: false,
                                }));
                                connection.addUnreliableSocket(socket);
                                return;
                            } else {
                                socket.send(JSON.stringify({
                                    reliable: true,
                                }));
                                connection = new MuWebSocketConnection(sessionId, socket, () => {
                                    if (connection) {
                                        this._connections.splice(this._connections.indexOf(connection), 1);
                                        for (let i = this.clients.length - 1; i >= 0; --i) {
                                            if (this.clients[i].sessionId === connection.sessionId) {
                                                this.clients.splice(i, 1);
                                            }
                                        }
                                    }
                                }, this._logger);
                                this._connections.push(connection);

                                const client = new MuWebSocketClient(connection, this.scheduler, this._logger);
                                this.clients.push(client);

                                spec.connection(client);
                                return;
                            }
                        } catch (e) {
                            this._logger.exception(e);
                            socket.terminate();
                        }
                    };
                })
                .on('error', (e) => this._logger.exception(e))
                .on('listening', () => this._logger.log(`muwebsocket server listening: ${JSON.stringify(this._wsServer.address())}`))
                .on('close', () => this._logger.log('muwebsocket server closing'))
                .on('headers', (headers) => this._logger.log(`muwebsocket: headers ${headers}`));

                this._onClose = spec.close;

                this.state = MuSocketServerState.RUNNING;
                spec.ready();
            },
            0);
    }

    public close () {
        if (this.state === MuSocketServerState.SHUTDOWN) {
            return;
        }
        this.state = MuSocketServerState.SHUTDOWN;

        if (this._wsServer) {
            this._wsServer.close(this._onClose);
        }
    }
}
