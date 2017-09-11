import { createWebSocketServer } from '../ws/socket-node';

const server = createWebSocketServer({
    server: null,
});

server.start({
    onReady (err?) {
        if (err) {
            return console.log(err);
        }
        console.log('server started');
    },
    onConnection (socket) {
        socket.start({
            onReady (err?) {
                if (err) {
                    return console.log(err);
                }
                console.log(`${socket.sessionId} connected`);
            },
            onMessage (message) {
                console.log(`${socket.sessionId}:${message}`);
            },
            onUnreliableMessage (message) {
                console.log(`~${socket.sessionId}:${message}`);
            },
            onClose () {
                console.log(`${socket.sessionId} disconnected`);
            },
        });
    },
});