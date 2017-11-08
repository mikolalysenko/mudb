import {
    MuSessionId,
    MuSocket,
    MuSocketSpec,
    MuSocketServer,
    MuSocketServerSpec,
} from 'mudb/socket';
import ws = require('uws');

const RELIABLE_PACKET = JSON.stringify({ reliable: true });
const UNRELIABLE_PACKET = JSON.stringify({ reliable: false });

export interface UWSSocketInterface {
    onmessage:(message:{data:Uint8Array|string}) => void;
    onclose:() => void;
    send:(data:Uint8Array|string) => void;
    close:() => void;
}

function noop () {}

export class MuWebSocketConnectionImpl {
    public readonly sessionId:string;

    public started:boolean = false;
    public closed:boolean = false;

    public reliableSocket:UWSSocketInterface;
    public unreliableSockets:UWSSocketInterface[] = [];

    public pendingMessages:(Uint8Array | string)[] = [];

    public nextMessageBox = 0;

    public onMessage:(data:Uint8Array|string, unreliable:boolean) => void = noop;
    public onClose:() => void = noop;
    public serverClose:() => void;

    constructor (sessionId:string, reliableSocket:UWSSocketInterface, serverClose:() => void) {
        this.sessionId = sessionId;
        this.serverClose = serverClose;
        this.reliableSocket = reliableSocket;
        this.reliableSocket.onmessage = ({data}) => {
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
            this._handleClose();
        };
    }

    public addSocket (socket:UWSSocketInterface) {
        if (this.closed) {
            return;
        }
        this.unreliableSockets.push(socket);
        socket.onmessage = ({ data }) => {
            this.onMessage(data, true);
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
                this.unreliableSockets[this.nextMessageBox++ % this.unreliableSockets.length].send(data);
            }
        } else {
            this.reliableSocket.send(data);
        }
    }

    public close () {
        this.reliableSocket.close();
    }

    private _handleClose () {
        this.closed = true;

        // close all unreliable sockets
        for (let i = 0; i < this.unreliableSockets.length; ++i) {
            this.unreliableSockets[i].close();
        }

        // fire close handler
        this.onClose();

        // remove connection from server
        this.serverClose();
    }
}

export class MuWebSocketClient implements MuSocket {
    public readonly sessionId:MuSessionId;
    public open:boolean = false;

    private _started:boolean = false;
    private _closed:boolean = false;

    private _connection:MuWebSocketConnectionImpl;

    constructor (connection:MuWebSocketConnectionImpl) {
        this.sessionId = connection.sessionId;
        this._connection = connection;
    }

    public start(spec:MuSocketSpec) {
        if (this._started) {
            throw new Error('socket already started');
        }
        if (this._closed) {
            throw new Error('socket closed');
        }
        this._started = true;
        setTimeout(
            () => {
                // hook handlers on socket
                this._connection.started = true;
                this._connection.onMessage = spec.message;
                this._connection.onClose = () => {
                    this._closed = true;
                    this.open = false;
                    spec.close();
                };

                // set open flag
                this.open = true;

                // fire ready handler
                spec.ready();

                // process any pending messages
                for (let i = 0; i < this._connection.pendingMessages.length; ++i) {
                    const message = this._connection.pendingMessages[i];
                    spec.message(message, false);
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

    public send(data:Uint8Array, unreliable?:boolean) {
        this._connection.send(data, !!unreliable);
    }

    public close() {
        this._connection.close();
    }
}

export class MuWebSocketServer implements MuSocketServer {
    public clients:MuWebSocketClient[] = [];
    public open:boolean = false;

    private _connections:MuWebSocketConnectionImpl[] = [];

    private _started:boolean = false;
    private _closed:boolean = false;

    private _maxUnreliableConnections:number = 10;

    private _websocketServer:ws.Server;

    private _httpServer;

    constructor (spec:{
        server:object,
    }) {
        this._httpServer = spec.server;
    }

    public start(spec:MuSocketServerSpec) {
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
                .on('connection', (socket) => {
                    socket.onmessage = ({data}) => {
                        try {
                            const packet = JSON.parse(data);
                            const sessionId = packet.sessionId;
                            if (typeof sessionId !== 'string') {
                                throw new Error('bad session id');
                            }
                            let connection = this._getConnection(sessionId);
                            if (connection) {
                                socket.send(JSON.stringify({
                                    reliable: false,
                                }));
                                return connection.addSocket(socket);
                            } else {
                                socket.send(JSON.stringify({
                                    reliable: true,
                                }));
                                connection = new MuWebSocketConnectionImpl(sessionId, socket, () => {
                                    if (connection) {
                                        this._connections.splice(this._connections.indexOf(connection), 1);
                                        for (let i = this.clients.length - 1; i >= 0; --i) {
                                            if (this.clients[i].sessionId === connection.sessionId) {
                                                this.clients.splice(i, 1);
                                            }
                                        }
                                    }
                                });
                                const client = new MuWebSocketClient(connection);
                                this._connections.push(connection);
                                this.clients.push(client);
                                return spec.connection(client);
                            }
                        } catch (e) {
                            console.error(e);
                        }
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

    private _getConnection(sessionId:string) : MuWebSocketConnectionImpl | null {
        for (let i = 0; i < this._connections.length; ++i) {
            if (this._connections[i].sessionId === sessionId) {
                return this._connections[i];
            }
        }
        return null;
    }

    public close() {
        if (this._closed) {
            return;
        }
        this._closed = true;
        if (this._websocketServer) {
            this._websocketServer.close();
        }
    }
}
