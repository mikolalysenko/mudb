import * as test from 'tape';

import { createLocalSocket, createLocalSocketServer } from '../';
import { MuSocketState } from '../../socket';

function noop () { }

function id () {
    return Math.random().toString(36).substr(2);
}

test('socket initial state', (t) => {
    const socket = createLocalSocket({
        sessionId: id(),
        server: createLocalSocketServer(),
    });
    t.equal(socket.state(), MuSocketState.INIT, 'should be INIT');
    t.end();
});

test('socket.open() - when INIT', (t) => {
    let unreliableMessageFromClient = 0;
    let reliableMessagesFromClient = 0;

    const server = createLocalSocketServer();
    const clientSocket = createLocalSocket({
        sessionId: id(),
        server,
    });

    server.start({
        ready: noop,
        connection: (serverSocket) => {
            t.equal(clientSocket._duplex, serverSocket);
            t.equal(clientSocket.state(), MuSocketState.OPEN);
            t.equal(serverSocket.state(), MuSocketState.INIT);

            serverSocket.open({
                ready: () => {
                    t.equal(serverSocket.state(), MuSocketState.OPEN);

                    clientSocket.send('unreliable message from client', true);
                    clientSocket.send('another unreliable message from client', true);
                    clientSocket.send('reliable message from client', false);
                    clientSocket.send('another reliable message from client', false);

                    setTimeout(() => {
                        t.equal(unreliableMessageFromClient, 2, 'should send pending unreliable messages');
                        t.equal(reliableMessagesFromClient, 2, 'should send pending reliable messages');
                        t.end();
                    }, 0);
                },
                message: (_, unreliable) => {
                    if (unreliable) {
                        ++unreliableMessageFromClient;
                    } else {
                        ++reliableMessagesFromClient;
                    }
                },
                close: noop,
            });
        },
        close: noop,
    });

    clientSocket.open({
        ready: noop,
        message: noop,
        close: noop,
    });
});

test('socket.open() - when OPEN', (t) => {
    t.plan(1);

    const socket = createLocalSocket({
        sessionId: id(),
        server: createLocalSocketServer(),
    });

    socket.open({
        // attempt to open socket when it is already OPEN
        ready: () => socket.open({
            ready: noop,
            message: noop,
            close: noop,
        }),
        message: noop,
        close: (error) => t.equal(typeof error, 'string', 'should invoke close handler with error message'),
    });
});

test('socket.open() - when CLOSED', (t) => {
    t.plan(1);

    const socket = createLocalSocket({
        sessionId: id(),
        server: createLocalSocketServer(),
    });

    socket.open({
        ready: () => {
            socket.close();

            // attempt to open socket when it is already CLOSED
            socket.open({
                ready: noop,
                message: noop,
                close: noop,
            });
        },
        message: noop,
        close: (error) => {
            if (error) {
                t.equal(typeof error, 'string', 'should invoke close handler with error message');
            }
        },
    });
});

test('socket.send() - when OPEN', (t) => {
    const server = createLocalSocketServer();
    const clientSocket = createLocalSocket({
        sessionId: id(),
        server,
    });

    server.start({
        ready: noop,
        connection: (serverSocket) => serverSocket.open({
            ready: () => {
                clientSocket.send('unreliable message from client');
            },
            message: () => {
                t.pass('should get message from client');
                t.end();
            },
            close: noop,
        }),
        close: noop,
    });

    clientSocket.open({
        ready: noop,
        message: noop,
        close: noop,
    });
});

test('socket.send() - when CLOSED', (t) => {
    t.plan(1);

    const server = createLocalSocketServer();
    const clientSocket = createLocalSocket({
        sessionId: id(),
        server,
    });

    server.start({
        ready: noop,
        connection: (serverSocket) => serverSocket.open({
            ready: () => {
                clientSocket.close();

                clientSocket.send('message never got sent');
                t.pass('should not send anything');
            },
            message: () => t.fail('should not invoke message handler'),
            close: noop,
        }),
        close: noop,
    });

    clientSocket.open({
        ready: noop,
        message: noop,
        close: noop,
    });
});

test('socket.close() - when OPEN', (t) => {
    t.plan(6);

    const server = createLocalSocketServer();
    const clientSocket = createLocalSocket({
        sessionId: id(),
        server,
    });

    server.start({
        ready: noop,
        connection: (serverSocket) => {
            serverSocket.open({
                ready: () => {
                    t.equal(server.clients.length, 1);
                    clientSocket.close();
                },
                message: noop,
                close: (error) => {
                    t.equal(error, undefined, 'should invoke close handler without error messages');
                    t.equal(server.clients.length, 0, 'should remove connection from server');
                    t.equal(serverSocket.state(), MuSocketState.CLOSED, 'should also close server socket');
                },
            });
        },
        close: noop,
    });

    clientSocket.open({
        ready: noop,
        message: noop,
        close: (error) => {
            t.equal(error, undefined, 'should invoke close handler without error messages');
            t.equal(clientSocket.state(), MuSocketState.CLOSED, 'should change socket state to CLOSED');
        },
    });
});

test('socket.close() - when INIT', (t) => {
    const socket = createLocalSocket({
        sessionId: id(),
        server: createLocalSocketServer(),
    });
    socket.close();

    t.equal(socket.state(), MuSocketState.CLOSED, 'should change socket state to CLOSED');
    t.end();
});

test('socket.close() - when CLOSED', (t) => {
    t.plan(1);

    let callsToOnClose = 0;

    const socket = createLocalSocket({
        sessionId: id(),
        server: createLocalSocketServer(),
    });

    socket.open({
        ready: () => {
            socket.close();

            // attempt to close socket when it is already CLOSED
            socket.close();
            t.equal(callsToOnClose, 1, 'should not invoke close handler');
        },
        message: noop,
        close: () => ++callsToOnClose,
    });
});
