import {
    HelSocket,
    HelSocketSpec,
    HelServer,
    HelServerSpec,
    HelData,
    HelConnectionHandler,
    HelMessageHandler,
    HelCloseHandler,
    HelSessionId,
} from '../net';

import WebSocket from 'ws';

function noop () {}

export class HelWebSocket implements HelSocket {
    public sessionId:HelSessionId;

    private _started:boolean = false;
    private _closed:boolean = false;

    private _onMessage:HelMessageHandler = noop;
    private _onUnreliableMessage:HelMessageHandler = noop;
    private _onClose:HelCloseHandler = noop;

    private _reliableQueue:HelData[];
    private _unreliableQueue:HelData[];

    private _reliableSocket;
    private _unreliableSockets;
    private _unreliableCounter = 0;

    private _server:HelWebSocketServer;

    public open:boolean = false;

    constructor (
        sessionId:HelSessionId,
        reliableSocket,
        reliableMessages:HelData[],
        unreliableSockets,
        unreliableMessages:HelData[],
        server:HelWebSocketServer) {
        this.sessionId = sessionId;
        this._reliableSocket = reliableSocket;
        this._reliableQueue = reliableMessages;
        this._unreliableSockets = unreliableSockets;
        this._unreliableQueue = unreliableMessages;
        this._server = server;

        const handleReliable = (message) => {
            this._reliableQueue.push(message);
        };

        const handleUnreliable = (message) => {
            this._unreliableQueue.push(message);
        };

        const handleClose = (code, reason) => {
            if (this._closed) {
                return;
            }
            this._closed = true;
            this._reliableSocket.terminate();
            for (let i = 0; i < this._unreliableSockets.length; ++i) {
                this._unreliableSockets[i].terminate();
            }
        };

        reliableSocket.on('message', handleReliable);
        reliableSocket.on('close', handleClose);

        unreliableSockets.forEach((socket) => {
            socket.on('message', handleUnreliable);
            socket.on('close', handleClose);
        });
    }

    public start (spec:HelSocketSpec) {
        let pendingOpenCount = 0;

        const setupSocket = () => {
            if (pendingOpenCount-- > 0) {
                return;
            }
            if (this._closed) {
                return spec.onReady('websocket closed');
            }
            if (this._started) {
                return spec.onReady('websocket server already started');
            }

            this.open = true;

            this._started = true;
            this._onMessage = spec.onMessage;
            this._onUnreliableMessage = spec.onUnreliableMessage;
            this._onClose = spec.onClose;

            const queue = this._reliableQueue;
            for (let i = 0; i < queue.length; ++i) {
                try {
                    this._onMessage(queue[i]);
                } catch (e) {}
            }
            queue.length = 0;

            const uqueue = this._unreliableQueue;
            for (let i = 0; i < uqueue.length; ++i) {
                try {
                    this._onUnreliableMessage(uqueue[i]);
                } catch (e) {}
            }
            uqueue.length = 0;

            const handleReliableMessage = this._onMessage;
            const handleUnreliableMessage = this._onUnreliableMessage;
            const handleClose = (code, reason) => {
                if (this._closed) {
                    return;
                }
                this._reliableSocket.terminate();
                for (let i = 0; i < this._unreliableSockets.length; ++i) {
                    this._unreliableSockets.terminate();
                }
                this._onClose(reason);
            };

            this._reliableSocket.removeAllListeners();
            this._reliableSocket.on('message', handleReliableMessage);
            this._reliableSocket.on('close', handleClose);

            for (let i = 0; i < this._unreliableSockets.length; ++i) {
                const socket = this._unreliableSockets[i];

                socket.removeAllListeners();
                socket.on('message', handleUnreliableMessage);
                socket.on('close', handleClose);
            }

            // ready
            spec.onReady();
        };

        // Defer initialization until sockets leave connecting state
        const checkSocket = (socket) => {
            if (socket.readyState === WebSocket.CONNECTING) {
                ++pendingOpenCount;
                socket.on('open', setupSocket);
            }
        };

        checkSocket(this._reliableSocket);
        for (let i = 0; i < this._unreliableSockets.length; ++i) {
            checkSocket(this._unreliableSockets.length);
        }
        if (pendingOpenCount === 0) {
            setupSocket();
        }
    }

    public send (message:HelData) {
        if (!this._started || this._closed) {
            throw new Error('socket not open');
        }
        this._reliableSocket.send(message);
    }

    public sendUnreliable (message:HelData) {
        if (!this._started || this._closed) {
            throw new Error('socket not open');
        }
        const pool = this._unreliableSockets;
        pool[(this._unreliableCounter++) % pool.length].send(message);
    }

    public close () {
        if (!this._started || this._closed) {
            throw new Error('socket not open');
        }

        this._reliableSocket.terminate();
        for (let i = 0; i < this._unreliableSockets.length; ++i) {
            this._unreliableSockets[i].terminate();
        }

        const clientIndex = this._server.clients.indexOf(this);
        if (clientIndex >= 0) {
            this._server.clients[clientIndex] = this._server.clients[this._server.clients.length - 1];
            this._server.clients.pop();
        }
    }
}

class PendingClient {
    public connectTime:Date = new Date();
    public reliableSocket;
    public reliableMessages:HelData[] = [];
    public unreliableSockets:any[] = [];
    public unreliableMessages:HelData[] = [];
    public numUnreliableSockets:number;

    constructor (numUnreliableSockets) {
        this.numUnreliableSockets = numUnreliableSockets;
    }
}

export class HelWebSocketServer implements HelServer {
    private _started:boolean = false;

    private _onConnection:HelConnectionHandler = noop;
    private _onClose:HelCloseHandler = noop;

    private _httpServer;
    private _wsServer;

    private _backlog:number;
    private _verifyClient;
    private _perMessageDeflate;
    private _path:string;

    private _maxUnreliableConnections:number;

    public clients:HelWebSocket[] = [];
    private _pendingConnections:{ [sessionId:string]:PendingClient };

    constructor (httpServer) {
        this._httpServer = httpServer;
    }

    public start (spec:HelServerSpec) {
        process.nextTick(() => {
            if (this._started) {
                return spec.onReady('server already started');
            }

            this._started = true;

            this._onConnection = spec.onConnection;

            // start websocket server
            this._wsServer = new WebSocket.Server(
                {
                    server: this._httpServer,
                    clientTracking: false,
                    verifyClient: this._verifyClient,
                    path: this._path,
                },
                () => {
                    spec.onReady();
                });

            this._wsServer.on('connection', (socket, req) => {
                socket.once('message', (message) => {
                    try {
                        const packet = JSON.parse(message);

                        const sessionId = packet.sessionId;
                        const role = packet.role;

                        for (let i = 0; i < this.clients.length; ++i) {
                            const client = this.clients[i];
                            if (client.sessionId === sessionId) {
                                return socket.terminate();
                            }
                        }

                        if (!(sessionId in this._pendingConnections)) {
                            this._pendingConnections[sessionId] = new PendingClient(this._maxUnreliableConnections);
                        }
                        const pending = this._pendingConnections[sessionId];

                        const killPending = () => {
                            if (sessionId in this._pendingConnections) {
                                delete this._pendingConnections[sessionId];
                                if (pending.reliableSocket) {
                                    pending.reliableSocket.terminate();
                                }
                                for (let i = 0; i < pending.unreliableSockets.length; ++i) {
                                    pending.unreliableSockets[i].terminate();
                                }
                            }
                        };

                        if (role === 'reliable') {
                            if (pending.reliableSocket ||
                                typeof packet.numUnreliable !== 'number' ||
                                packet.numUnreliable <= 0 ||
                                packet.numUnreliable !== (packet.numUnreliable | 0) ||
                                packet.numUnreliable > this._maxUnreliableConnections) {
                                socket.terminate();
                                return;
                            }
                            pending.reliableSocket = socket;
                            pending.numUnreliableSockets = packet.numUnreliable;
                            socket.onMessage((data) => {
                                pending.reliableMessages.push(data);
                            });
                            socket.onClose(killPending);
                        } else {
                            pending.unreliableSockets.push(socket);
                            socket.onMessage((data) => {
                                pending.unreliableMessages.push(data);
                            });
                            socket.onClose(killPending);
                        }

                        if (pending.reliableSocket &&
                            pending.unreliableSockets.length >= pending.numUnreliableSockets) {
                            delete this._pendingConnections[sessionId];
                            const client = new HelWebSocket(
                                sessionId,
                                pending.reliableSocket,
                                pending.reliableMessages,
                                pending.unreliableSockets,
                                pending.unreliableMessages,
                                this);
                            this.clients.push(client);
                            this._onConnection(socket);
                        }
                    } catch (e) {
                        socket.terminate();
                    }
                });
            });
        });
    }

    public close () {
        while (this.clients.length > 0) {
            this.clients[0].close();
        }
    }
}

export function createWebSocketServer (spec:{
    server:any;
    maxUnreliableSockets?:number;
}) {
    return new HelWebSocketServer(spec.server);
}