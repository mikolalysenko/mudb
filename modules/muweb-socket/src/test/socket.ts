import os = require('os');
import test = require('tape');

import { MuSocketState } from 'mudb/socket';
import { MuWebSocket } from '../socket';

function noop () {}

function id () {
    return Math.random().toString(36).substr(2);
}

function ipAddress () {
    const networkInterfaces = os.networkInterfaces();
    const interfaceNames = Object.keys(networkInterfaces);

    for (let i = 0; i < interfaceNames.length; ++i) {
        const networkInterface = networkInterfaces[interfaceNames[i]];
        for (let j = 0; j < networkInterface.length; ++j) {
            if (networkInterface[j].family === 'IPv4' && !networkInterface[j].internal) {
                return networkInterface[j].address;
            }
        }
    }
    return '127.0.0.1';
}

const url = `ws://${ipAddress()}:${process.env.PORT}`;

test('socket initial state', (t) => {
    const socket = new MuWebSocket({
        sessionId: id(),
        url,
    });
    t.equals(socket.state, MuSocketState.INIT, 'should be INIT');
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
            t.equals(socket.state, MuSocketState.OPEN, 'should change socket state to OPEN');
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
        close: () => t.equals(socket.state, MuSocketState.CLOSED, 'should change socket state to CLOSED'),
    });
});

test('socket.close() - when INIT', (t) => {
    const socket = new MuWebSocket({
        sessionId: id(),
        url,
    });

    socket.close();
    t.equals(socket.state, MuSocketState.CLOSED, 'should change socket state to CLOSED');
    t.end();
});
