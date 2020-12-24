import * as test from 'tape';
import { createLocalSocket, createLocalSocketServer } from '../';
import { MuLocalSocket } from '../';
import { MuSocketState, MuSocketServerState } from '../../socket';

function noop () { }

function id () {
    return Math.random().toString(36).substr(2);
}

test('server initial state', (t) => {
    const server = createLocalSocketServer();
    t.equal(server.state(), MuSocketServerState.INIT, 'should be INIT');
    t.end();
});

test('server.start() - when INIT', (t) => {
    t.plan(4);

    const server = createLocalSocketServer();
    server.start({
        ready: () => {
            t.equal(server.state(), MuSocketServerState.RUNNING, 'should change server state to RUNNING');
            setTimeout(() => {
                t.equal(server.clients.length, 1, 'should handle pending connections');
                server.close();
            }, 0);
        },
        connection: (socket) => t.true(socket instanceof MuLocalSocket, 'should set message handler'),
        close: (error) => t.equal(error, undefined, 'should set close handler'),
    });

    createLocalSocket({
        sessionId: id(),
        server,
    }).open({
        ready: noop,
        message: noop,
        close: noop,
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
        close: (error) => t.equal(typeof error, 'string', 'should invoke close handler with error message'),
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
                t.equal(typeof error, 'string', 'should invoke close handler with error message');
                t.equal(server.state(), MuSocketServerState.SHUTDOWN, 'should not change server state');
            }
        },
    });
});

test('server.close() - when RUNNING', (t) => {
    t.plan(5);

    const server = createLocalSocketServer();
    const clientSocket = createLocalSocket({
        sessionId: id(),
        server,
    });

    server.start({
        ready: noop,
        connection: (socket) => socket.open({
            ready: () => server.close(),
            message: noop,
            close: noop,
        }),
        close: (error) => {
            t.equal(error, undefined, 'should invoke close handler without error message');
            t.equal(server.state(), MuSocketServerState.SHUTDOWN, 'should change server state to SHUTDOWN');
            t.equal(server.clients.length, 0, 'should remove connection from server');
            t.equal(clientSocket.state(), MuSocketState.CLOSED, 'should close client socket');
            t.equal(clientSocket._duplex.state(), MuSocketState.CLOSED, 'should close server socket');
        },
    });

    clientSocket.open({
        ready: noop,
        message: noop,
        close: noop,
    });
});

// change state
// remove connections
// close server socket
// close client socket
// call close handler
test('server.close() - when RUNNING, sockets not OPEN', (t) => {
    t.plan(5);

    const server = createLocalSocketServer();
    const clientSocket = createLocalSocket({
        sessionId: id(),
        server,
    });

    server.start({
        // server socket not OPEN
        ready: () => server.close(),
        connection: noop,
        close: (error) => {
            t.equal(error, undefined, 'should invoke close handler without error message');
            t.equal(server.state(), MuSocketServerState.SHUTDOWN, 'should change server state to SHUTDOWN');
            t.equal(server.clients.length, 0, 'should remove connection from server');
            setTimeout(() => {
                t.equal(clientSocket.state(), MuSocketState.CLOSED, 'should close client socket');
                t.equal(clientSocket._duplex.state(), MuSocketState.CLOSED, 'should close server socket');
            }, 0);
        },
    });

    clientSocket.open({
        ready: noop,
        message: noop,
        close: noop,
    });
});

test('server.close() - when INIT', (t) => {
    const server = createLocalSocketServer();
    server.close();

    t.equal(server.state(), MuSocketServerState.SHUTDOWN, 'should change server state to SHUTDOWN');
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
            t.equal(callsToOnClose, 1, 'should not invoke close handler');
        },
        connection: noop,
        close: () => ++callsToOnClose,
    });
});
