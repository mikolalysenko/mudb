"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var socket_browser_1 = require("../ws/socket-browser");
var socket = socket_browser_1.connectToServer({
    sessionId: 'foo' + Math.random(),
    url: 'ws://' + location.host,
});
socket.start({
    onReady: function (err) {
        if (err) {
            return console.log(err);
        }
        var rcounter = 0;
        setInterval(function () {
            socket.send(new Uint8Array([rcounter++ % 256]));
        }, 32);
    },
    onMessage: function (message) {
        console.log(message);
    },
    onUnreliableMessage: function (message) {
        console.log(message);
    },
    onClose: function (err) {
        if (err) {
            console.log(err);
        }
    },
});
//# sourceMappingURL=ws-client.js.map