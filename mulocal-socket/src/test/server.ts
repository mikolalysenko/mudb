import test = require('tape');
import { createLocalSocket, createLocalSocketServer } from '../';
import { MuLocalSocket } from '../server-socket';
import { MuSocketState, MuSocketServerState } from 'mudb/socket';

function noop () {}

function id () {
    return Math.random().toString(36).substr(2);
}

test('server initial state', (t) => {
    const server = createLocalSocketServer();
    t.equals(server.state, MuSocketServerState.INIT, 'should be INIT');
    t.end();
});

test('server.start() - when INIT', (t) => {
    t.plan(4);

    const server = createLocalSocketServer();
    server.start({
        ready: () => {
            t.equals(server.state, MuSocketServerState.RUNNING, 'should change server state to RUNNING');
            t.equals(server.clients.length, 1, 'should handle pending connections');

            server.close();
        },
        connection: (socket) => t.true(socket instanceof MuLocalSocket, 'should set message handler'),
        close: (error) => t.equals(error, undefined, 'should set close handler'),
    });

    // create a pending connection to be handled when server is starting
    createLocalSocket({
        sessionId: id(),
        server,
    });
});

test('server.start() - when RUNNING', (t) => {
    t.plan(1);

    const server = createLocalSocketServer();
    server.start({
        ready: () => {
            // attempt to start server when it is RUNNING
            server.start({
                ready: noop,
                connection: noop,
                close: () => t.fail('should not call spec.close()'),
            });
        },
        connection: noop,
        close: (error) => t.equals(typeof error, 'string', 'should invoke close handler with error message'),
    });
});

test('server.start() - when SHUTDOWN', (t) => {
    t.plan(2);

    const server = createLocalSocketServer();
    server.start({
        ready: () => {
            server.close();

            // attempt to start server when it is SHUTDOWN
            server.start({
                ready: noop,
                connection: noop,
                close: () => t.fail('should not call spec.close()'),
            });
        },
        connection: noop,
        close: (error) => {
            if (error) {
                t.equals(typeof error, 'string', 'should invoke close handler with error message');
                t.equals(server.state, MuSocketServerState.SHUTDOWN, 'should not change server state');
            }
        },
    });
});

test('server.close() - when RUNNING', (t) => {
    t.plan(5);

    const server = createLocalSocketServer();
    server.start({
        ready: noop,
        connection: (socket) => socket.open({
            // close server when server socket is OPEN
            ready: () => server.close(),
            message: noop,
            close: noop,
        }),
        close: (error) => {
            t.equals(error, undefined, 'should invoke close handler without error message');

            t.equals(server.state, MuSocketServerState.SHUTDOWN, 'should change server state to SHUTDOWN');

            t.equals(server.clients.length, 0, 'should remove connection from server');
            t.equals(clientSocket.state, MuSocketState.CLOSED, 'should close client socket');
            t.equals(clientSocket._duplex.state, MuSocketState.CLOSED, 'should close server socket');
        },
    });

    // create a pending connection to be handled when server is starting
    const clientSocket = createLocalSocket({
        sessionId: id(),
        server,
    });
});

// change state
// remove connections
// close server socket
// close client socket
// call close handler
test('server.close() - when RUNNING, with sockets not OPEN', (t) => {
    t.plan(5);

    const server = createLocalSocketServer();
    server.start({
        // server socket not OPEN
        ready: () => server.close(),
        connection: noop,
        close: (error) => {
            t.equals(error, undefined, 'should invoke close handler without error message');

            t.equals(server.state, MuSocketServerState.SHUTDOWN, 'should change server state to SHUTDOWN');

            t.equals(server.clients.length, 0, 'should remove connection from server');
            t.equals(clientSocket.state, MuSocketState.CLOSED, 'should close client socket');
            t.equals(clientSocket._duplex.state, MuSocketState.CLOSED, 'should close server socket');
        },
    });

    // create a pending connection to be handled when server is starting
    const clientSocket = createLocalSocket({
        sessionId: id(),
        server,
    });
});

test('server.close() - when INIT', (t) => {
    const server = createLocalSocketServer();
    server.close();

    t.equals(server.state, MuSocketServerState.SHUTDOWN, 'should change server state to SHUTDOWN');
    t.end();
});

test('server.close() - when SHUTDOWN', (t) => {
    t.plan(1);

    let callsToOnClose = 0;

    const server = createLocalSocketServer();
    server.start({
        ready: () => {
            server.close();

            // attempt to close server when it is SHUTDOWN
            server.close();
            t.equals(callsToOnClose, 1, 'should not invoke close handler');
        },
        connection: noop,
        close: () => ++callsToOnClose,
    });
});
