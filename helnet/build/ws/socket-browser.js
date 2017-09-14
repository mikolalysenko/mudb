"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var HelWebSocketDOM = (function () {
    function HelWebSocketDOM(sessionId, url, numUnreliable) {
        this._started = false;
        this._closed = false;
        this._currentSocket = 0;
        this.open = false;
        this.sessionId = sessionId;
        this._url = url;
        this._numUnreliable = numUnreliable;
    }
    HelWebSocketDOM.prototype.start = function (spec) {
        var _this = this;
        if (this._started) {
            setTimeout(function () {
                spec.onReady('socket already started');
            }, 0);
            return;
        }
        this._started = true;
        var reliableCount = 1;
        var unreliableCount = this._numUnreliable;
        var firedReady = false;
        var abortConnect = function () {
            if (!firedReady) {
                firedReady = true;
                spec.onReady('connection failed');
            }
            if (_this._closed) {
                return;
            }
            _this._closed = true;
            _this._reliableSocket.close();
            for (var i = 0; i < _this._unreliableSockets.length; ++i) {
                _this._unreliableSockets[i].close();
            }
        };
        var checkSocketStatus = function () {
            if (reliableCount !== 0 ||
                unreliableCount !== 0 ||
                _this._closed) {
                return;
            }
            var close = function () { return _this.close(); };
            _this._reliableSocket.onclose = close;
            _this._reliableSocket.onmessage = function (_a) {
                var data = _a.data;
                return _this._onMessage(data);
            };
            var onUnreliableMessage = function (_a) {
                var data = _a.data;
                return _this._onUnreliableMessage(data);
            };
            for (var i = 0; i < _this._unreliableSockets.length; ++i) {
                _this._unreliableSockets[i].onclose = close;
                _this._unreliableSockets[i].onmessage = onUnreliableMessage;
            }
            _this.open = true;
            _this._onMessage = spec.onMessage;
            _this._onUnreliableMessage = spec.onUnreliableMessage;
            _this._onClose = spec.onClose;
            firedReady = true;
            spec.onReady();
        };
        this._reliableSocket = new WebSocket(this._url);
        this._reliableSocket.onopen = function () {
            _this._reliableSocket.send(JSON.stringify({
                role: 'reliable',
                sessionId: _this.sessionId,
                numUnreliable: _this._numUnreliable,
            }));
            --reliableCount;
            checkSocketStatus();
        };
        this._reliableSocket.onclose = abortConnect;
        var unreliable = [];
        for (var i = 0; i < this._numUnreliable; ++i) {
            var ws = new WebSocket(this._url);
            unreliable.push(ws);
            ws.onopen = (function (ws_) {
                return function () {
                    ws_.send(JSON.stringify({
                        role: 'unreliable',
                        sessionId: _this.sessionId,
                    }));
                    --unreliableCount;
                    checkSocketStatus();
                };
            })(ws);
            ws.onclose = abortConnect;
        }
        this._unreliableSockets = unreliable;
    };
    HelWebSocketDOM.prototype.send = function (message) {
        if (this.open) {
            this._reliableSocket.send(message);
        }
    };
    HelWebSocketDOM.prototype.sendUnreliable = function (message) {
        if (this.open) {
            this._unreliableSockets[this._currentSocket++ % this._unreliableSockets.length].send(message);
        }
    };
    HelWebSocketDOM.prototype.close = function () {
    };
    return HelWebSocketDOM;
}());
exports.HelWebSocketDOM = HelWebSocketDOM;
function connectToServer(spec) {
    return new HelWebSocketDOM(spec.sessionId, spec.url, spec.numUnreliable || 5);
}
exports.connectToServer = connectToServer;
//# sourceMappingURL=socket-browser.js.map