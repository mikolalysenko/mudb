import uWS = require('uWebSockets.js');
import ws = require('ws');
import test = require('tape');

import getFreePort = require('../../util/get-free-port');
import { MuUWSSocketServer } from '../server';
import { MuUWSSocket } from '../client';
import { MuSocketState } from '../../socket';

function noop () { }

function randStr () {
    return Math.random().toString(36).substring(2);
}

test.onFinish(() => process.exit(0));
(<any>test).onFailure(() => process.exit(1));

const server = uWS.App();
const socketServer = new MuUWSSocketServer({ server });
socketServer.start({
    ready: noop,
    connection: noop,
    close: noop,
});

getFreePort((port) => {
    socketServer.listen({ port });

    const url = `ws://127.0.0.1:${port}`;

    test('socket initial state', (t) => {
        const socket = new MuUWSSocket({
            sessionId: randStr(),
            url,
            ws,
        });
        t.equal(socket.state(), MuSocketState.INIT, 'should be INIT');
        t.end();
    });

    test('socket.open() when INIT', (t) => {
        t.plan(3);

        const socket = new MuUWSSocket({
            sessionId: randStr(),
            url,
            ws,
        });
        socket.open({
            ready: () => {
                t.equal(socket.state(), MuSocketState.OPEN, 'should change state to OPEN');
                t.pass('should invoke ready handler only once');
                t.end();
            },
            message: noop,
            close: noop,
        });
        t.equal(socket.state(), MuSocketState.INIT, 'should not change state immediately');
    });

    test('socket.open() when OPEN', (t) => {
        t.plan(2);

        const socket = new MuUWSSocket({
            sessionId: randStr(),
            url,
            ws,
        });
        socket.open({
            ready: () => {
                t.equal(socket.state(), MuSocketState.OPEN);
                t.throws(() => {
                    socket.open({
                        ready: noop,
                        message: noop,
                        close: noop,
                    });
                });
                t.end();
            },
            message: noop,
            close: noop,
        });
    });

    test('socket.open() when CLOSED', (t) => {
        t.plan(2);

        const socket = new MuUWSSocket({
            sessionId: randStr(),
            url,
            ws,
        });
        socket.open({
            ready: () => {
                socket.close();
                t.equal(socket.state(), MuSocketState.CLOSED);
                t.throws(() => {
                    socket.open({
                        ready: noop,
                        message: noop,
                        close: noop,
                    });
                });
                t.end();
            },
            message: noop,
            close: noop,
        });
    });

    test('socket.close() when INIT', (t) => {
        const socket = new MuUWSSocket({
            sessionId: randStr(),
            url,
            ws,
        });
        t.equal(socket.state(), MuSocketState.INIT);
        socket.close();
        t.equal(socket.state(), MuSocketState.CLOSED, 'should change state to CLOSED immediately');
        t.end();
    });

    test('socket.close when OPEN', (t) => {
        t.plan(3);

        const socket = new MuUWSSocket({
            sessionId: randStr(),
            url,
            ws,
        });
        socket.open({
            ready: () => {
                t.equal(socket.state(), MuSocketState.OPEN);
                socket.close();
                t.equal(socket.state(), MuSocketState.CLOSED, 'should change state to CLOSED immediately');
            },
            message: noop,
            close: () => {
                t.pass('should invoke close handler only once');
                t.end();
            },
        });
    });

    test('socket.close when CLOSED', (t) => {
        t.plan(1);

        let closed = false;

        const socket = new MuUWSSocket({
            sessionId: randStr(),
            url,
            ws,
        });
        socket.open({
            ready: () => {
                socket.close();
                t.equal(socket.state(), MuSocketState.CLOSED);
                socket.close();
            },
            message: noop,
            close: () => {
                if (closed) {
                    t.fail('should not invoke invoke close handler again');
                }
                closed = true;
            },
        });
    });
});
