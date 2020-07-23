import tape = require('tape');
import http = require('http');
import { findPort, findPortAsync } from '../../../util/port';
import { MuWebSocketServer } from '../server';
import { MuWebSocket } from '../client';
import { MuSocketState } from '../../socket';

function noop () { }

function sessionId () {
    return Math.random().toString(36).substring(2);
}

tape('session id', async (t) => {
    const server = http.createServer();
    const socketServer = new MuWebSocketServer({ server });

    const sid = 'abc`1234567890-=~!@#$%^&*()_+[]\;\',./{}|:"<>?xyz';
    const port = await findPortAsync();
    const socket = new MuWebSocket({
        sessionId: sid,
        url: `ws://127.0.0.1:${port}`,
    });

    socketServer.start({
        ready: () => {
            socket.open({
                ready: noop,
                message: noop,
                close: noop,
            });
        },
        connection: (sock) => {
            t.equal(sock.sessionId, sid, `should be escaped`);
            t.end();
        },
        close: () => {},
    });
    server.listen(port);
});

findPort((port) => {
    const server = http.createServer();
    const socketServer = new MuWebSocketServer({ server });
    socketServer.start({
        ready: noop,
        connection: noop,
        close: noop,
    });
    server.listen(port);

    const url = `ws://127.0.0.1:${port}`;

    tape('socket.open() - when INIT', (t) => {
        t.plan(2);

        let callsToReady = 0;

        const socket = new MuWebSocket({
            sessionId: sessionId(),
            url,
        });
        t.equal(socket.state(), MuSocketState.INIT, 'initial state should be INIT');

        socket.open({
            ready: () => {
                ++callsToReady;

                if (callsToReady > 1) {
                    t.fail('should not call ready handler more than once');
                }
                t.equal(socket.state(), MuSocketState.OPEN, 'should change socket state to OPEN');
            },
            message: noop,
            close: noop,
        });
    });

    tape('socket.open() - when OPEN', (t) => {
        t.plan(1);

        const socket = new MuWebSocket({
            sessionId: sessionId(),
            url,
        });

        socket.open({
            ready: () => {
                t.throws(
                    () => socket.open({
                        ready: noop,
                        message: noop,
                        close: noop,
                    }),
                );
            },
            message: noop,
            close: noop,
        });
    });

    tape('socket.open() - when CLOSED', (t) => {
        t.plan(1);

        const socket = new MuWebSocket({
            sessionId: sessionId(),
            url,
        });

        socket.open({
            ready: () => socket.close(),
            message: noop,
            close: () => t.throws(
                () => socket.open({
                    ready: noop,
                    message: noop,
                    close: noop,
                }),
            ),
        });
    });

    tape('socket.close() - when OPEN', (t) => {
        t.plan(1);

        const socket = new MuWebSocket({
            sessionId: sessionId(),
            url,
        });

        socket.open({
            ready: () => socket.close(),
            message: noop,
            close: () => t.equal(socket.state(), MuSocketState.CLOSED, 'should change socket state to CLOSED'),
        });
    });

    tape('socket.close() - when INIT', (t) => {
        const socket = new MuWebSocket({
            sessionId: sessionId(),
            url,
        });

        socket.close();
        t.equal(socket.state(), MuSocketState.CLOSED, 'should change socket state to CLOSED');
        t.end();
    });
});
