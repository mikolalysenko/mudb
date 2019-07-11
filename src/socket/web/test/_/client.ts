import test = require('tape');

import { MuSocketState } from '../../../../socket';
import { MuWebSocket } from '../../client';

function noop () { }

function id () {
    return Math.random().toString(36).substr(2);
}

const url = `ws://127.0.0.1:${process.env.PORT}`;

test('socket initial state', (t) => {
    const socket = new MuWebSocket({
        sessionId: id(),
        url,
    });
    t.equal(socket.state, MuSocketState.INIT, 'should be INIT');
    t.end();
});

test('socket.open() - when INIT', (t) => {
    t.plan(1);

    let callsToReady = 0;

    const socket = new MuWebSocket({
        sessionId: id(),
        url,
    });

    socket.open({
        ready: () => {
            ++callsToReady;

            if (callsToReady > 1) {
                t.fail('should not call ready handler more than once');
            }
            t.equal(socket.state, MuSocketState.OPEN, 'should change socket state to OPEN');
        },
        message: noop,
        close: noop,
    });
});

test('socket.open() - when OPEN', (t) => {
    t.plan(1);

    const socket = new MuWebSocket({
        sessionId: id(),
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

test('socket.open() - when CLOSED', (t) => {
    t.plan(1);

    const socket = new MuWebSocket({
        sessionId: id(),
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

test('socket.close() - when OPEN', (t) => {
    t.plan(1);

    const socket = new MuWebSocket({
        sessionId: id(),
        url,
    });

    socket.open({
        ready: () => socket.close(),
        message: noop,
        close: () => t.equal(socket.state, MuSocketState.CLOSED, 'should change socket state to CLOSED'),
    });
});

test('socket.close() - when INIT', (t) => {
    const socket = new MuWebSocket({
        sessionId: id(),
        url,
    });

    socket.close();
    t.equal(socket.state, MuSocketState.CLOSED, 'should change socket state to CLOSED');
    t.end();
});
