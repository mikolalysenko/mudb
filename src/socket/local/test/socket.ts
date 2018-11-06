import test = require('tape');
import { createLocalSocket, createLocalSocketServer } from '../';
import { MuSocketState, MuSocketServerState } from '../../../core/socket';

function noop () {}

function id () {
    return Math.random().toString(36).substr(2);
}

test('socket initial state', (t) => {
    const socket = createLocalSocket({
        sessionId: id(),
        server: createLocalSocketServer(),
    });
    t.equals(socket.state, MuSocketState.INIT, 'should be INIT');
    t.end();
});

test('socket.open() - when INIT', (t) => {
    t.plan(5);

    let unreliableMessageFromClient = 0;
    let reliableMessagesFromClient = 0;

    const server = createLocalSocketServer();
    server.start({
        ready: noop,
        connection: (serverSocket) => serverSocket.open({
            ready: () => {
                // attempt to send messages from client socket when it is not OPEN
                clientSocket.send('unreliable message from client', true);
                clientSocket.send('another unreliable message from client', true);
                clientSocket.send('reliable message from client', false);
                clientSocket.send('another reliable message from client', false);

                clientSocket.open({
                    ready: () => {
                        t.equals(clientSocket.state, MuSocketState.OPEN, 'should change socket state to OPEN');
                        t.equals(unreliableMessageFromClient, 2, 'should send pending unreliable messages');
                        t.equals(reliableMessagesFromClient, 2, 'should send pending reliable messages');

                        clientSocket._duplex.send('unreliable message from server');
                    },
                    message: () => {
                        t.pass('should set message handler');
                        clientSocket.close();
                    },
                    close: (error) => t.equals(error, undefined, 'should set close handler'),
                });
            },
            message: (_, unreliable) => {
                if (unreliable) {
                    ++unreliableMessageFromClient;
                } else {
                    ++reliableMessagesFromClient;
                }
            },
            close: noop,
        }),
        close: noop,
    });

    const clientSocket = createLocalSocket({
        sessionId: id(),
        server,
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
        close: (error) => t.equals(typeof error, 'string', 'should invoke close handler with error message'),
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
                t.equals(typeof error, 'string', 'should invoke close handler with error message');
            }
        },
    });
});

test('socket.send() - when OPEN', (t) => {
    t.plan(1);

    const server = createLocalSocketServer();
    server.start({
        ready: noop,
        connection: (serverSocket) => serverSocket.open({
            // open client socket after server socket is OPEN
            ready: () => clientSocket.open({
                // send message from client socket when it is OPEN
                ready: () => clientSocket.send('unreliable message from client'),
                message: noop,
                close: noop,
            }),
            message: () => t.pass('should send messages to server'),
            close: noop,
        }),
        close: noop,
    });

    const clientSocket = createLocalSocket({
        sessionId: id(),
        server,
    });
});

test('socket.send() - when INIT', (t) => {
    t.plan(2);

    let unreliableMessagesReceived = 0;
    let reliableMessagesReceived = 0;

    const server = createLocalSocketServer();
    server.start({
        ready: noop,
        connection: (serverSocket) => serverSocket.open({
            // when server socket is OPEN
            ready: () => {
                // attempt to send messages when client socket is INIT
                // messages are pending until socket is OPEN
                clientSocket.send('unreliable message', true);
                clientSocket.send('another unreliable message', true);
                clientSocket.send('reliable message', false);
                clientSocket.send('another reliable message', false);

                clientSocket.open({
                    ready: () => {
                        // pending messages are sent when client socket is OPEN
                        t.equals(unreliableMessagesReceived, 2, 'should save unreliable messages until socket is OPEN');
                        t.equals(reliableMessagesReceived, 2, 'should save reliable messages until socket is OPEN');
                    },
                    message: noop,
                    close: noop,
                });
            },
            message: (_, unreliable) => {
                if (unreliable) {
                    ++unreliableMessagesReceived;
                } else {
                    ++reliableMessagesReceived;
                }
            },
            close: noop,
        }),
        close: noop,
    });

    const clientSocket = createLocalSocket({
        sessionId: id(),
        server,
    });
});

test('socket.send() - when CLOSED', (t) => {
    t.plan(1);

    const server = createLocalSocketServer();
    server.start({
        ready: noop,
        connection: (serverSocket) => serverSocket.open({
            ready: () => {
                clientSocket.close();

                // attempt to send message when client socket is CLOSED
                clientSocket.send('message never got sent');
                t.pass('should return silently');
            },
            message: () => t.fail('should not invoke message handler'),
            close: noop,
        }),
        close: noop,
    });

    const clientSocket = createLocalSocket({
        sessionId: id(),
        server,
    });
});

test('socket.close() - when OPEN', (t) => {
    t.plan(4);

    const server = createLocalSocketServer();
    server.start({
        ready: noop,
        connection: (serverSocket) => serverSocket.open({
            // open client socket when server socket is OPEN
            ready: () => clientSocket.open({
                // close client socket when it is OPEN
                ready: () => clientSocket.close(),
                message: noop,
                close: (error) => {
                    t.equals(error, undefined, 'should invoke close handler without error message');
                    t.equals(clientSocket.state, MuSocketState.CLOSED, 'should change socket state to CLOSED');
                },
            }),
            message: noop,
            close: (error) => {
                t.equals(server.clients.length, 0, 'should remove connection from server');
                t.equals(serverSocket.state, MuSocketState.CLOSED, 'should also close server socket');
            },
        }),
        close: noop,
    });

    const clientSocket = createLocalSocket({
        sessionId: id(),
        server,
    });
});

test('socket.close() - when INIT', (t) => {
    const socket = createLocalSocket({
        sessionId: id(),
        server: createLocalSocketServer(),
    });
    socket.close();

    t.equals(socket.state, MuSocketState.CLOSED, 'should change socket state to CLOSED');
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
            t.equals(callsToOnClose, 1, 'should not invoke close handler')
        },
        message: noop,
        close: () => ++callsToOnClose,
    });
});
