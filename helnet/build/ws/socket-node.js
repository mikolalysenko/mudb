"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ws_1 = require("ws");
function noop() { }
var HelWebSocket = (function () {
    function HelWebSocket(sessionId, reliableSocket, reliableMessages, unreliableSockets, unreliableMessages, server) {
        var _this = this;
        this._started = false;
        this._closed = false;
        this._onMessage = noop;
        this._onUnreliableMessage = noop;
        this._onClose = noop;
        this._unreliableCounter = 0;
        this.open = false;
        this.sessionId = sessionId;
        this._reliableSocket = reliableSocket;
        this._reliableQueue = reliableMessages;
        this._unreliableSockets = unreliableSockets;
        this._unreliableQueue = unreliableMessages;
        this._server = server;
        var handleReliable = function (message) {
            _this._reliableQueue.push(message);
        };
        var handleUnreliable = function (message) {
            _this._unreliableQueue.push(message);
        };
        var handleClose = function (code, reason) {
            if (_this._closed) {
                return;
            }
            _this._closed = true;
            _this._reliableSocket.terminate();
            for (var i = 0; i < _this._unreliableSockets.length; ++i) {
                _this._unreliableSockets[i].terminate();
            }
        };
        reliableSocket.on('message', handleReliable);
        reliableSocket.on('close', handleClose);
        unreliableSockets.forEach(function (socket) {
            socket.on('message', handleUnreliable);
            socket.on('close', handleClose);
        });
    }
    HelWebSocket.prototype.start = function (spec) {
        var _this = this;
        var pendingOpenCount = 0;
        var setupSocket = function () {
            if (pendingOpenCount-- > 0) {
                return;
            }
            if (_this._closed) {
                return spec.onReady('websocket closed');
            }
            if (_this._started) {
                return spec.onReady('websocket server already started');
            }
            _this.open = true;
            _this._started = true;
            _this._onMessage = spec.onMessage;
            _this._onUnreliableMessage = spec.onUnreliableMessage;
            _this._onClose = spec.onClose;
            var queue = _this._reliableQueue;
            for (var i = 0; i < queue.length; ++i) {
                try {
                    _this._onMessage(queue[i]);
                }
                catch (e) { }
            }
            queue.length = 0;
            var uqueue = _this._unreliableQueue;
            for (var i = 0; i < uqueue.length; ++i) {
                try {
                    _this._onUnreliableMessage(uqueue[i]);
                }
                catch (e) { }
            }
            uqueue.length = 0;
            var handleReliableMessage = _this._onMessage;
            var handleUnreliableMessage = _this._onUnreliableMessage;
            var handleClose = function (code, reason) {
                if (_this._closed) {
                    return;
                }
                _this._reliableSocket.terminate();
                for (var i = 0; i < _this._unreliableSockets.length; ++i) {
                    _this._unreliableSockets.terminate();
                }
                _this._onClose(reason);
            };
            _this._reliableSocket.removeAllListeners();
            _this._reliableSocket.on('message', handleReliableMessage);
            _this._reliableSocket.on('close', handleClose);
            for (var i = 0; i < _this._unreliableSockets.length; ++i) {
                var socket = _this._unreliableSockets[i];
                socket.removeAllListeners();
                socket.on('message', handleUnreliableMessage);
                socket.on('close', handleClose);
            }
            spec.onReady();
        };
        var checkSocket = function (socket) {
            if (socket.readyState === ws_1.default.CONNECTING) {
                ++pendingOpenCount;
                socket.on('open', setupSocket);
            }
        };
        checkSocket(this._reliableSocket);
        for (var i = 0; i < this._unreliableSockets.length; ++i) {
            checkSocket(this._unreliableSockets.length);
        }
        if (pendingOpenCount === 0) {
            setupSocket();
        }
    };
    HelWebSocket.prototype.send = function (message) {
        if (!this._started || this._closed) {
            throw new Error('socket not open');
        }
        this._reliableSocket.send(message);
    };
    HelWebSocket.prototype.sendUnreliable = function (message) {
        if (!this._started || this._closed) {
            throw new Error('socket not open');
        }
        var pool = this._unreliableSockets;
        pool[(this._unreliableCounter++) % pool.length].send(message);
    };
    HelWebSocket.prototype.close = function () {
        if (!this._started || this._closed) {
            throw new Error('socket not open');
        }
        this._reliableSocket.terminate();
        for (var i = 0; i < this._unreliableSockets.length; ++i) {
            this._unreliableSockets[i].terminate();
        }
        var clientIndex = this._server.clients.indexOf(this);
        if (clientIndex >= 0) {
            this._server.clients[clientIndex] = this._server.clients[this._server.clients.length - 1];
            this._server.clients.pop();
        }
    };
    return HelWebSocket;
}());
exports.HelWebSocket = HelWebSocket;
var PendingClient = (function () {
    function PendingClient(numUnreliableSockets) {
        this.connectTime = new Date();
        this.reliableMessages = [];
        this.unreliableSockets = [];
        this.unreliableMessages = [];
        this.numUnreliableSockets = numUnreliableSockets;
    }
    return PendingClient;
}());
var HelWebSocketServer = (function () {
    function HelWebSocketServer(httpServer) {
        this._started = false;
        this._onConnection = noop;
        this._onClose = noop;
        this.clients = [];
        this._httpServer = httpServer;
    }
    HelWebSocketServer.prototype.start = function (spec) {
        var _this = this;
        process.nextTick(function () {
            if (_this._started) {
                return spec.onReady('server already started');
            }
            _this._started = true;
            _this._onConnection = spec.onConnection;
            _this._wsServer = new ws_1.default.Server({
                server: _this._httpServer,
                clientTracking: false,
                verifyClient: _this._verifyClient,
                path: _this._path,
            }, function () {
                spec.onReady();
            });
            _this._wsServer.on('connection', function (socket, req) {
                socket.once('message', function (message) {
                    try {
                        var packet = JSON.parse(message);
                        var sessionId_1 = packet.sessionId;
                        var role = packet.role;
                        for (var i = 0; i < _this.clients.length; ++i) {
                            var client = _this.clients[i];
                            if (client.sessionId === sessionId_1) {
                                return socket.terminate();
                            }
                        }
                        if (!(sessionId_1 in _this._pendingConnections)) {
                            _this._pendingConnections[sessionId_1] = new PendingClient(_this._maxUnreliableConnections);
                        }
                        var pending_1 = _this._pendingConnections[sessionId_1];
                        var killPending = function () {
                            if (sessionId_1 in _this._pendingConnections) {
                                delete _this._pendingConnections[sessionId_1];
                                if (pending_1.reliableSocket) {
                                    pending_1.reliableSocket.terminate();
                                }
                                for (var i = 0; i < pending_1.unreliableSockets.length; ++i) {
                                    pending_1.unreliableSockets[i].terminate();
                                }
                            }
                        };
                        if (role === 'reliable') {
                            if (pending_1.reliableSocket ||
                                typeof packet.numUnreliable !== 'number' ||
                                packet.numUnreliable <= 0 ||
                                packet.numUnreliable !== (packet.numUnreliable | 0) ||
                                packet.numUnreliable > _this._maxUnreliableConnections) {
                                socket.terminate();
                                return;
                            }
                            pending_1.reliableSocket = socket;
                            pending_1.numUnreliableSockets = packet.numUnreliable;
                            socket.onMessage(function (data) {
                                pending_1.reliableMessages.push(data);
                            });
                            socket.onClose(killPending);
                        }
                        else {
                            pending_1.unreliableSockets.push(socket);
                            socket.onMessage(function (data) {
                                pending_1.unreliableMessages.push(data);
                            });
                            socket.onClose(killPending);
                        }
                        if (pending_1.reliableSocket &&
                            pending_1.unreliableSockets.length >= pending_1.numUnreliableSockets) {
                            delete _this._pendingConnections[sessionId_1];
                            var client = new HelWebSocket(sessionId_1, pending_1.reliableSocket, pending_1.reliableMessages, pending_1.unreliableSockets, pending_1.unreliableMessages, _this);
                            _this.clients.push(client);
                            _this._onConnection(socket);
                        }
                    }
                    catch (e) {
                        socket.terminate();
                    }
                });
            });
        });
    };
    HelWebSocketServer.prototype.close = function () {
        while (this.clients.length > 0) {
            this.clients[0].close();
        }
    };
    return HelWebSocketServer;
}());
exports.HelWebSocketServer = HelWebSocketServer;
function createWebSocketServer(spec) {
    return new HelWebSocketServer(spec.server);
}
exports.createWebSocketServer = createWebSocketServer;
//# sourceMappingURL=socket-node.js.map