import * as test from 'tape';

import { createLocalSocketServer, createLocalSocket } from '../index';
import { MuServer } from '../../../server';
import { MuClient } from '../../../client';
import { MuSocketState } from '../../socket';

function randomId () {
    return Math.random().toString(36).substring(2);
}

test('client socket will always be open first', (t) => {
    t.test('when server starts first', (st) => {
        st.plan(3);

        const socketServer = createLocalSocketServer();
        const clientSocket = createLocalSocket({
            sessionId: randomId(),
            server: socketServer,
        });
        const serverSocket = clientSocket._duplex;

        const server = new MuServer(socketServer);
        const client = new MuClient(clientSocket);

        server.start({
            ready: () => client.start({
                ready: () => {
                    st.equal(clientSocket.state(), MuSocketState.OPEN);
                    st.equal(serverSocket.state(), MuSocketState.INIT);
                    setTimeout(() => st.equal(serverSocket.state(), MuSocketState.OPEN), 0);
                },
            }),
        });
    });

    t.test('when client starts first', (st) => {
        st.plan(3);

        const socketServer = createLocalSocketServer();
        const clientSocket = createLocalSocket({
            sessionId: randomId(),
            server: socketServer,
        });
        const serverSocket = clientSocket._duplex;

        const server = new MuServer(socketServer);
        const client = new MuClient(clientSocket);

        client.start({
            ready: () => server.start({
                ready: () => {
                    st.equal(clientSocket.state(), MuSocketState.OPEN);
                    st.equal(serverSocket.state(), MuSocketState.INIT);
                    setTimeout(() => st.equal(serverSocket.state(), MuSocketState.OPEN), 0);
                },
            }),
        });
    });

    t.end();
});
