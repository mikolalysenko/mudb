/*
import { createWebSocketServer } from '../ws/socket-node';
import tape = require('tape');
import WebSocket = require('ws');
import http = require('http');

function createLogServer () {
    const httpServer = http.createServer();
    httpServer.listen(8080);
    const server = createWebSocketServer({
        server: httpServer,
    });

    const eventLog:object[] = [];
    let open = false;
    server.start({
        onReady (err) {
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
        onConnection (socket) {
            eventLog.push({
                type: 'connect',
                id: socket.sessionId,
            });
        },
    });

    return {
        httpServer,
        server,
        eventLog,
        close (cb) {
            const interval = setInterval(
                () => {
                    if (open) {
                        clearInterval(interval);
                        server.close();
                        httpServer.close();
                    }
                },
                10);
        },
        connect () {
            return new WebSocket('ws://localhost:8080');
        },
    };
}

tape('start connection', (t) => {
    const {
        httpServer,
        server,
        eventLog,
        close,
        connect,
    } = createLogServer();

    close(() => {
        t.end();
    });
});
*/