import tcp = require('net');
import udp = require('dgram');

import {
    MuSocketServer,
    MuSocketServerState,
    MuSocketServerSpec,
    MuSocket,
    MuSocketState,
    MuSocketSpec,
    MuSessionId,
    MuData,
    MuMessageHandler,
    MuCloseHandler,
} from 'mudb/socket';

import { messagify, isJSON } from './util';

function noop () { }

class MuNetSocketClient implements MuSocket {
    public readonly sessionId:MuSessionId;

    private _state = MuSocketState.INIT;
    get state () : MuSocketState {
        return this._state;
    }

    private _reliableSocket:tcp.Socket;

    private _unreliableSocket:udp.Socket;
    private _remotePort:number;
    private _remoteAddr:string;

    private _pendingMessages:MuData[] = [];

    public onmessage:MuMessageHandler = noop;
    private _onclose:MuCloseHandler = noop;

    constructor (
        sessionId:MuSessionId,
        reliableSocket:tcp.Socket,
        unreliableSocket:udp.Socket,
        remotePort:number,
        remoteAddr:string,
        removeConnection:() => void,
    ) {
        this.sessionId = sessionId;
        this._reliableSocket = reliableSocket;
        this._unreliableSocket = unreliableSocket;
        this._remotePort = remotePort;
        this._remoteAddr = remoteAddr;

        this._reliableSocket.on('message', (msg) => {
            if (isJSON(msg)) {
                this._pendingMessages.push(msg.toString());
            } else {
                // make a copy in case buffer is reused
                this._pendingMessages.push(new Uint8Array(msg).slice(0));
            }
        });
        this._reliableSocket.on('close', (hadError) => {
            // in case of errors
            this._state = MuSocketState.CLOSED;

            this._onclose();
            removeConnection();
            if (hadError) {
                console.error('mudb/net-socket: socket was closed due to a transmission error');
            }
        });
    }

    public open (spec:MuSocketSpec) {
        if (this._state !== MuSocketState.INIT) {
            throw new Error('mudb/net-socket: socket was already opened');
        }

        setTimeout(
            () => {
                const onmessage = this.onmessage = spec.message;
                this._onclose = spec.close;
                this._state = MuSocketState.OPEN;

                spec.ready();

                this._reliableSocket.on('message', (msg) => {
                    if (this._state !== MuSocketState.OPEN) {
                        return;
                    }

                    if (isJSON(msg)) {
                        onmessage(msg.toString(), false);
                    } else {
                        onmessage(new Uint8Array(msg), false);
                    }
                });

                for (let i = 0; i < this._pendingMessages.length; ++i) {
                    onmessage(this._pendingMessages[i], false);
                }
                this._pendingMessages.length = 0;
            },
            0,
        );
    }

    public send (data:MuData, unreliable?:boolean) {
        if (this._state !== MuSocketState.OPEN) {
            return;
        }

        if (unreliable) {
            const buf = Buffer.from(data);
            this._unreliableSocket.send(buf, 0, buf.length, this._remotePort, this._remoteAddr);
        } else {
            this._reliableSocket.write(data);
        }
    }

    public close () {
        if (this._state === MuSocketState.CLOSED) {
            return;
        }

        this._state = MuSocketState.CLOSED;
        this._reliableSocket.end();
    }
}

export class MuNetSocketServer implements MuSocketServer {
    private _state = MuSocketServerState.INIT;
    get state () : MuSocketServerState {
        return this._state;
    }

    public clients:MuSocket[] = [];

    private _tcpServer:tcp.Server;
    private _udpServer:udp.Socket;

    private _unreliableMsgHandlers:{ [url:string]:(buf:Buffer) => void } = {};

    private _onclose:MuCloseHandler;

    constructor (spec:{
        tcpServer:tcp.Server,
        udpServer:udp.Socket,
    }) {
        this._tcpServer = spec.tcpServer;
        this._udpServer = spec.udpServer;
    }

    public start (spec:MuSocketServerSpec) {
        if (this._state !== MuSocketServerState.INIT) {
            throw new Error('mudb/net-socket: server was already started');
        }

        this._tcpServer.on('connection', (socket) => {
            socket.setNoDelay(true);
            messagify(socket);

            socket.on('error', (err) => {
                console.error(err.stack);
            });
            socket.once('message', (message) => {
                try {
                    const clientInfo = JSON.parse(message.toString());
                    if (typeof clientInfo.i !== 'string' ||
                        typeof clientInfo.p !== 'number' ||
                        typeof clientInfo.a !== 'string') {
                        throw new Error('bad client info');
                    }

                    const udpServerInfo = this._udpServer.address();
                    socket.write(JSON.stringify({
                        p: udpServerInfo.port,
                        a: udpServerInfo.address,
                    }));

                    const url = `${clientInfo.a}:${clientInfo.p}`;
                    const client = new MuNetSocketClient(
                        clientInfo.i,
                        socket,
                        this._udpServer,
                        clientInfo.p,
                        clientInfo.a,
                        () => {
                            this.clients.splice(this.clients.indexOf(client), 1);
                            delete this._unreliableMsgHandlers[url];
                        },
                    );
                    this.clients.push(client);

                    this._unreliableMsgHandlers[url] = function (msg) {
                        if (client.state !== MuSocketState.OPEN) {
                            return;
                        }

                        if (isJSON(msg)) {
                            client.onmessage(msg.toString(), true);
                        } else {
                            client.onmessage(new Uint8Array(msg), true);
                        }
                    };

                    spec.connection(client);
                } catch (e) {
                    console.error(`mudb/net-socket: destroying socket due to ${e}`);
                    socket.destroy();
                }
            });
        });

        this._udpServer.on('listening', () => {
            const addr = this._udpServer.address().address;
            if (addr === '0.0.0.0' || addr === '::') {
                console.warn(`mudb/net-socket: UDP server is bound to ${addr}. Are you sure?`);
            }
        });
        this._udpServer.on('message', (msg, client) => {
            const onmessage = this._unreliableMsgHandlers[`${client.address}:${client.port}`];
            if (typeof onmessage === 'function') {
                onmessage(msg);
            }
        });

        this._onclose = spec.close;
        this._state = MuSocketServerState.RUNNING;

        spec.ready();
    }

    public close () {
        if (this._state === MuSocketServerState.SHUTDOWN) {
            return;
        }

        this._state = MuSocketServerState.SHUTDOWN;
        this._tcpServer.close(this._onclose);
        this._udpServer.close();
    }
}
