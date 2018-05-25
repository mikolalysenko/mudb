import ws = require('uws');
import {
    MuSessionId,
    MuSocketState,
    MuSocketServerState,
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

    // every client communicates through one reliable and several unreliable sockets
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

    public state = MuSocketState.INIT;

    constructor (connection:MuWebSocketConnection) {
        this.sessionId = connection.sessionId;
        this._connection = connection;
    }

    public open (spec:MuSocketSpec) {
        if (this.state === MuSocketState.OPEN) {
            throw new Error('socket already open');
        }
        if (this.state === MuSocketState.CLOSED) {
            throw new Error('cannot reopen closed socket');
        }

        setTimeout(
            () => {
                this._connection.started = true;

                // hook handlers on socket
                this._connection.onMessage = spec.message;
                this._connection.onClose = () => {
                    this.state = MuSocketState.CLOSED;
                    spec.close();
                };

                this.state = MuSocketState.OPEN;

                spec.ready();

                // process pending messages
                for (let i = 0; i < this._connection.pendingMessages.length; ++i) {
                    spec.message(this._connection.pendingMessages[i], false);
                }
                this._connection.pendingMessages.length = 0;

                // if socket already closed, then fire close event immediately
                if (this._connection.closed) {
                    this.state = MuSocketState.CLOSED;
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

    public state = MuSocketServerState.INIT;

    private _httpServer;
    private _websocketServer:ws.Server;

    private _onClose;

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
        if (this.state === MuSocketServerState.RUNNING) {
            throw new Error('web socket server already running');
        }
        if (this.state === MuSocketServerState.SHUTDOWN) {
            throw new Error('web socket server already shut down, cannot restart');
        }

        setTimeout(
            () => {
                this._websocketServer = new ws.Server({
                    server: this._httpServer,
                })
                // called when connection is ready
                .on('connection', (socket) => {
                    socket.onmessage = ({ data }) => {
                        try {
                            const sessionId = JSON.parse(data).sessionId;
                            if (typeof sessionId !== 'string') {
                                throw new Error('bad session ID');
                            }

                            let connection = this._findConnection(sessionId);
                            if (connection) {
                                // tell client to use this socket as an unreliable one
                                socket.send(JSON.stringify({
                                    reliable: false,
                                }));

                                // all sockets except the first one opened are used as unreliable ones
                                // reset socket message handler
                                connection.addUnreliableSocket(socket);
                                return;
                            } else {
                                // this is client's first connection since no related connection object is found

                                // tell client to use this socket as a reliable one
                                socket.send(JSON.stringify({
                                    reliable: true,
                                }));

                                // one connection object per client
                                // reset socket message handler
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
                            socket.terminate();
                        }
                    };
                });

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

        if (this._websocketServer) {
            this._websocketServer.close(this._onClose);
        }
    }
}
