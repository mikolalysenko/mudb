"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var socket_node_1 = require("../ws/socket-node");
var tape = require("tape");
var WebSocket = require("ws");
var http = require("http");
function createLogServer() {
    var httpServer = http.createServer();
    httpServer.listen(8080);
    var server = socket_node_1.createWebSocketServer({
        server: httpServer,
    });
    var eventLog = [];
    var open = false;
    server.start({
        onReady: function (err) {
            open = true;
            if (err) {
                eventLog.push({
                    type: 'ready',
                    error: err,
                });
                return;
            }
            eventLog.push({
                type: 'ready',
            });
        },
        onConnection: function (socket) {
            eventLog.push({
                type: 'connect',
                id: socket.sessionId,
            });
        },
    });
    return {
        httpServer: httpServer,
        server: server,
        eventLog: eventLog,
        close: function (cb) {
            var interval = setInterval(function () {
                if (open) {
                    clearInterval(interval);
                    server.close();
                    http.terminate();
                }
            }, 10);
        },
        connect: function () {
            return new WebSocket('ws://localhost:8080');
        },
    };
}
tape('start connection', function (t) {
    var _a = createLogServer(), httpServer = _a.httpServer, server = _a.server, eventLog = _a.eventLog, close = _a.close, connect = _a.connect;
    close(function () {
        t.end();
    });
});
//# sourceMappingURL=ws-node.js.map