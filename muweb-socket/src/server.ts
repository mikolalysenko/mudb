import ws = require('uws');
import {
    MuSessionId,
    MuSocket,
    MuSocketSpec,
    MuSocketServer,
    MuSocketServerSpec,
} from 'mudb/socket';

export interface UWSSocketInterface {
    onmessage:(message:{ data:Uint8Array|string }) => void;
    onclose:() => void;
    send:(data:Uint8Array|string) => void;
    close:() => void;
}

function noop () {}

export class MuWebSocketConnection {
    public readonly sessionId:string;

    public started = false;
    public closed = false;

    // each client can have one reliable socket and several unreliable ones
    public reliableSocket:UWSSocketInterface;
    public unreliableSockets:UWSSocketInterface[] = [];

    private _nextSocketSend = 0;

    public pendingMessages:(Uint8Array|string)[] = [];

    // for onmessage handler
    public onMessage:(data:Uint8Array|string, unreliable:boolean) => void = noop;

    // both for onclose handler
    public onClose:() => void = noop;
    public serverClose:() => void;

    constructor (sessionId:string, reliableSocket:UWSSocketInterface, serverClose:() => void) {
        this.sessionId = sessionId;
        this.reliableSocket = reliableSocket;
        this.serverClose = serverClose;

        this.reliableSocket.onmessage = ({ data }) => {
            if (this.started) {
                if (typeof data === 'string') {
                    this.onMessage(data, false);
                } else {
                    this.onMessage(new Uint8Array(data), false);
                }
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

    public addUnreliableSocket (socket:UWSSocketInterface) {
        if (this.closed) {
            return;
        }

        this.unreliableSockets.push(socket);
        socket.onmessage = ({ data }) => {
            if (typeof data === 'string') {
                this.onMessage(data, true);
            } else {
                this.onMessage(new Uint8Array(data), true);
            }
        };
        socket.onclose = () => {
            this.unreliableSockets.splice(this.unreliableSockets.indexOf(socket), 1);
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
    public readonly sessionId:MuSessionId;

    private _connection:MuWebSocketConnection;

    public open = false;
    private _started = false;
    private _closed = false;

    constructor (connection:MuWebSocketConnection) {
        this.sessionId = connection.sessionId;
        this._connection = connection;
    }

    public start (spec:MuSocketSpec) {
        if (this._started) {
            throw new Error('socket already started');
        }
        if (this._closed) {
            throw new Error('socket already closed');
        }
        this._started = true;

        setTimeout(
            () => {
                this._connection.started = true;

                // hook handlers on socket
                this._connection.onMessage = spec.message;
                this._connection.onClose = () => {
                    this._closed = true;
                    this.open = false;
                    spec.close();
                };

                this.open = true;

                spec.ready();

                // process pending messages
                for (let i = 0; i < this._connection.pendingMessages.length; ++i) {
                    spec.message(this._connection.pendingMessages[i], false);
                }
                this._connection.pendingMessages.length = 0;

                // if socket already closed, then fire close event immediately
                if (this._connection.closed) {
                    this._closed = true;
                    this.open = false;
                    spec.close();
                }
            },
            0);
    }

    public send (data:Uint8Array, unreliable?:boolean) {
        this._connection.send(data, !!unreliable);
    }

    public close () {
        this._connection.close();
    }
}

export class MuWebSocketServer implements MuSocketServer {
    private _connections:MuWebSocketConnection[] = [];
    public clients:MuWebSocketClient[] = [];

    public open = false;
    private _started = false;
    private _closed = false;

    private _maxUnreliableConnections = 10;

    private _httpServer;
    private _websocketServer:ws.Server;

    constructor (spec:{
        server:object,
    }) {
        this._httpServer = spec.server;
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
        if (this._started) {
            throw new Error('web socket server already started');
        }
        if (this._closed) {
            throw new Error('web socket server already closed');
        }
        this._started = true;

        setTimeout(
            () => {
                this._websocketServer = new ws.Server({
                    server: this._httpServer,
                })
                // when connection is ready
                .on('connection', (socket) => {
                    socket.onmessage = ({ data }) => {
                        try {
                            const sessionId = JSON.parse(data).sessionId;
                            if (typeof sessionId !== 'string') {
                                throw new Error('bad session ID');
                            }

                            let connection = this._findConnection(sessionId);
                            if (connection) {
                                // tell client to use this socket as unreliable one
                                socket.send(JSON.stringify({
                                    reliable: false,
                                }));
                                // all sockets except the first one opened are used as unreliable ones
                                connection.addUnreliableSocket(socket);
                                return;
                            } else {
                                // this is client's first connection since no related connection object is found

                                // tell client to use this socket as reliable one
                                socket.send(JSON.stringify({
                                    reliable: true,
                                }));

                                // one connection object per client
                                connection = new MuWebSocketConnection(sessionId, socket, () => {
                                    if (connection) {
                                        this._connections.splice(this._connections.indexOf(connection), 1);
                                        for (let i = this.clients.length - 1; i >= 0; --i) {
                                            if (this.clients[i].sessionId === connection.sessionId) {
                                                this.clients.splice(i, 1);
                                            }
                                        }
                                    }
                                });
                                this._connections.push(connection);

                                const client = new MuWebSocketClient(connection);
                                this.clients.push(client);

                                spec.connection(client);
                                return;
                            }
                        } catch (e) {
                            console.error(e);
                        }

                        // close connection on error
                        socket.terminate();
                    };
                })
                .on('close', () => {
                    this._closed = true;
                    this.open = false;
                    if (spec && spec.close) {
                        spec.close();
                    }
                });

                this.open = true;
                spec.ready();
            },
            0);
    }

    public close () {
        if (this._closed) {
            return;
        }

        // necessary
        this._closed = true;

        if (this._websocketServer) {
            this._websocketServer.close();
        }
    }
}
