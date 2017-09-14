"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function noop() { }
;
function connectDuplexPair(a, b) {
    a._duplex = b;
    b._duplex = a;
}
var HelLocalSocket = (function () {
    function HelLocalSocket(sessionId, server) {
        var _this = this;
        this._duplex = null;
        this._onMessage = noop;
        this._onUnreliableMessage = noop;
        this._onClose = noop;
        this._started = false;
        this._closed = false;
        this._pendingMessages = [];
        this._pendingDrainTimeout = 0;
        this._handleDrain = function () {
            _this._pendingDrainTimeout = 0;
            for (var i = 0; i < _this._pendingMessages.length; ++i) {
                if (_this._closed) {
                    return;
                }
                var message = _this._pendingMessages[i];
                try {
                    _this._duplex._onMessage(message);
                }
                catch (e) { }
            }
            _this._pendingMessages.length = 0;
        };
        this._pendingUnreliableMessages = [];
        this._handleUnreliableDrain = function () {
            if (_this._closed) {
                return;
            }
            var message = _this._pendingUnreliableMessages.pop();
            _this._clientPair.onMessage(_this._clientPair, message);
        };
        this.sessionId = sessionId;
        this._server = server;
    }
    HelLocalSocket.prototype.start = function (spec) {
        if (this._started) {
            spec.onReady.call(this, 'socket already started');
            return;
        }
        this._onMessage = spec.onMessage;
        this._onUnreliableMessage = spec.onUnreliableMessage;
        this._onClose = spec.onClose;
        this._started = true;
        spec.onReady.call(this);
    };
    HelLocalSocket.prototype.send = function (data) {
        this._pendingMessages.push(data);
        if (!this._pendingDrainTimeout) {
            this._pendingDrainTimeout = setTimeout(this._handleDrain, 0);
        }
    };
    HelLocalSocket.prototype.sendUnreliable = function (data) {
        if (this._closed) {
            return;
        }
        this._pendingUnreliableMessages.push(data);
        setTimeout(this._handleUnreliableDrain, 0);
    };
    HelLocalSocket.prototype.close = function () {
        if (this._closed) {
            return;
        }
        this._closed = true;
        this.onClose();
    };
    return HelLocalSocket;
}());
exports.HelLocalSocket = HelLocalSocket;
var LocalServer = (function () {
    function LocalServer() {
    }
    LocalServer.prototype.onReady = function (handler) {
        setTimeout(handler, 0);
    };
    LocalServer.prototype.onConnection = function (handler) {
        this._handleConnection = handler;
    };
    LocalServer.prototype.broadcast = function (data) {
        for (var _i = 0, _a = this.clients; _i < _a.length; _i++) {
            var client = _a[_i];
            client.send(data);
        }
    };
    LocalServer.prototype.close = function () {
        for (var i = this.clients.length - 1; i >= 0; --i) {
            this.clients[i].close();
        }
    };
    return LocalServer;
}());
exports.LocalServer = LocalServer;
function createLocalServer(config) {
    var server = new LocalServer();
    return server;
}
exports.createLocalServer = createLocalServer;
function createLocalClient(config, onReady) {
    var client = new LocalClient();
    client._connectToServer(config.server);
    return client;
}
exports.createLocalClient = createLocalClient;
//# sourceMappingURL=local.js.map