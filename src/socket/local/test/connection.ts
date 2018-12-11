import test = require('tape');
import { createLocalSocketServer, createLocalSocket } from '../index';
import { MuServer } from '../../../server';
import { MuClient } from '../../../client';
import { MuSocketState } from '../../../socket';

function randomId () {
    return Math.random().toString(36).substring(2);
}

test('when server starts first', (t) => {
    t.plan(2);

    const socketServer = createLocalSocketServer();
    const clientSocket = createLocalSocket({
        sessionId: randomId(),
        server: socketServer,
    });
    const serverSocket = clientSocket._duplex;

    const server = new MuServer(socketServer);
    const client = new MuClient(clientSocket);

    server.start({
        // start client after server is started
        ready: () => client.start({
            ready: () => {
                // connecting
                t.equal(serverSocket.state, MuSocketState.INIT);
                // connected
                setTimeout(() => t.equal(serverSocket.state, MuSocketState.OPEN), 0);
            },
        }),
    });
});

test('when client starts first', (t) => {
    t.plan(2);

    const socketServer = createLocalSocketServer();
    const clientSocket = createLocalSocket({
        sessionId: randomId(),
        server: socketServer,
    });
    const serverSocket = clientSocket._duplex;

    const server = new MuServer(socketServer);
    const client = new MuClient(clientSocket);

    client.start({
        // start server after client is started
        ready: () => server.start({
            ready: () => {
                // connecting
                t.equal(serverSocket.state, MuSocketState.INIT);
                // connected
                setTimeout(() => t.equal(serverSocket.state, MuSocketState.OPEN), 0);
            },
        }),
    });
});
