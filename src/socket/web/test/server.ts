import test = require('tape');
import ip = require('ip');
import WebSocket = require('uws');

import http = require('http');

import { MuSocketServerState } from '../../../socket';
import { MuWebSocketServer } from '../server';

function noop () { }

const server = http.createServer();

test.onFinish(() => process.exit(0));

test('server initial state', (t) => {
    const socketServer = new MuWebSocketServer({ server });
    t.equal(socketServer.state, MuSocketServerState.INIT, 'should be INIT');
    t.end();
});

test('socketServer.start() - when INIT', (t) => {
    t.plan(2);

    const socketServer = new MuWebSocketServer({ server });
    socketServer.start({
        ready: () => {
            t.pass('should invoke ready handler');
            t.equal(socketServer.state, MuSocketServerState.RUNNING, 'should change server state to RUNNING');
        },
        connection: noop,
        close: noop,
    });
});

test('socketServer.start() - when RUNNING', (t) => {
    t.plan(1);

    const socketServer = new MuWebSocketServer({ server });
    socketServer.start({
        ready: () => {
            t.throws(
                () => socketServer.start({
                    ready: noop,
                    connection: noop,
                    close: noop,
                }),
            );
        },
        connection: noop,
        close: noop,
    });
});

test('socketServer.start() - when SHUTDOWN', (t) => {
    t.plan(1);

    const socketServer = new MuWebSocketServer({ server });
    socketServer.start({
        ready: () => {
            socketServer.close();
            t.throws(
                () => socketServer.start({
                    ready: noop,
                    connection: noop,
                    close: noop,
                }),
            );
        },
        connection: noop,
        close: noop,
    });
});

test('when a client connects', (t) => {
    t.plan(3);

    function id () {
        return Math.random().toString(36).substr(2);
    }

    let url = '';

    const socketServer = new MuWebSocketServer({ server });
    socketServer.start({
        ready: () => {
            t.pass('should invoke ready handler');

            let numSockets = 0;
            const numSocketsToOpen = 5;

            const sessionId = id();

            function openSocket () {
                const socket = new WebSocket(url);
                socket.binaryType = 'arraybuffer';

                socket.onopen = () => {
                    socket.onmessage = (ev) => {
                        if (typeof ev.data === 'string') {
                            const firstSocket = numSockets === 0;
                            if (firstSocket && JSON.parse(ev.data).reliable) {
                                ++numSockets;
                                t.pass('server should indicate first socket as reliable one');
                            }
                            if (!firstSocket && !JSON.parse(ev.data).reliable) {
                                ++numSockets;
                            }

                            if (numSockets === numSocketsToOpen) {
                                t.pass('server should indicate other sockets as unreliable ones');
                            }
                            if (numSockets > numSocketsToOpen) {
                                t.fail(`should not open more than ${numSocketsToOpen} sockets`);
                            }
                        }
                    };

                    socket.send(JSON.stringify({ sessionId }));
                };
            }

            for (let i = 0; i < numSocketsToOpen; ++i) {
                openSocket();
            }
        },
        // TODO test if connection handler is invoked with client object
        connection: noop,
        close: noop,
    });

    server.listen(() => {
        url = `ws://${ip.address()}:${server.address().port}`;
    });
});

test('socketServer.close() - when INIT', (t) => {
    const socketServer = new MuWebSocketServer({ server });
    socketServer.close();

    t.equal(socketServer.state, MuSocketServerState.SHUTDOWN, 'should change server state to SHUTDOWN');
    t.end();
});

test('socketServer.close() - when RUNNING', (t) => {
    t.plan(1);

    const socketServer = new MuWebSocketServer({ server });
    socketServer.start({
        ready: () => {
            socketServer.close();
            t.equal(socketServer.state, MuSocketServerState.SHUTDOWN, 'should change server state to SHUTDOWN');
        },
        connection: noop,
        close: noop,
    });
});
