import http = require('http');
import path = require('path');
import test = require('tape');

import { MuSocketServerState } from 'mudb/socket';
import { MuWebSocketServer } from '../server';

function noop () {}

const server = http.createServer();

const PORT = 8889;
server.listen(PORT);

test('server initial state', (t) => {
    const socketServer = new MuWebSocketServer({ server });
    t.equals(socketServer.state, MuSocketServerState.INIT, 'should be INIT');
    t.end();
});

test('socketServer.start() - when INIT', (t) => {
    t.plan(2);

    const socketServer = new MuWebSocketServer({ server });
    socketServer.start({
        ready: () => {
            t.pass('should invoke ready handler');
            t.equals(socketServer.state, MuSocketServerState.RUNNING, 'should change server state to RUNNING');
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

test('socketServer.close() - when INIT', (t) => {
    const socketServer = new MuWebSocketServer({ server });
    socketServer.close();

    t.equals(socketServer.state, MuSocketServerState.SHUTDOWN, 'should change server state to SHUTDOWN');
    t.end();
});

test('socketServer.close() - when RUNNING', (t) => {
    t.plan(2);

    const socketServer = new MuWebSocketServer({ server });
    socketServer.start({
        ready: () => {
            socketServer.close();
            t.equals(socketServer.state, MuSocketServerState.SHUTDOWN, 'should change server state to SHUTDOWN');
        },
        connection: noop,
        close: (error) => {
            t.equals(error, undefined, 'should invoke close handler without error message');
        },
    });
});
