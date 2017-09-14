"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var socket_node_1 = require("../ws/socket-node");
var http = require("http");
var httpServer = http.createServer();
var server = socket_node_1.createWebSocketServer({
    server: httpServer,
});
server.start({
    onReady: function (err) {
        if (err) {
            return console.log(err);
        }
        console.log('server started');
    },
    onConnection: function (socket) {
        socket.start({
            onReady: function (err) {
                if (err) {
                    return console.log(err);
                }
                console.log(socket.sessionId + " connected");
            },
            onMessage: function (message) {
                console.log(socket.sessionId + ":" + message);
            },
            onUnreliableMessage: function (message) {
                console.log("~" + socket.sessionId + ":" + message);
            },
            onClose: function () {
                console.log(socket.sessionId + " disconnected");
            },
        });
    },
});
httpServer.listen(8080);
//# sourceMappingURL=ws-server.js.map