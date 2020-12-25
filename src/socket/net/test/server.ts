import * as tcp from 'net';
import * as udp from 'dgram';

import * as test from 'tape';

import { MuNetSocketServer } from '../server';
import { MuSocketServerState } from '../../socket';

function noop () { }

test('server initial state', (t) => {
    const server = new MuNetSocketServer({
        tcpServer: tcp.createServer(),
        udpServer: udp.createSocket({
            type: 'udp4',
        }),
    });

    t.equal(server.state(), MuSocketServerState.INIT, 'should be INIT');
    t.end();
});

test('server.start() - when INIT', (t) => {
    t.plan(2);

    const server = new MuNetSocketServer({
        tcpServer: tcp.createServer(),
        udpServer: udp.createSocket({
            type: 'udp4',
        }),
    });

    server.start({
        ready: () => {
            t.ok(true, 'should invoke ready handler');
            t.equal(server.state(), MuSocketServerState.RUNNING, 'should change state to RUNNING');
        },
        connection: noop,
        close: noop,
    });
});

test('server.start() - when RUNNING', (t) => {
    t.plan(1);

    const server = new MuNetSocketServer({
        tcpServer: tcp.createServer(),
        udpServer: udp.createSocket({
            type: 'udp4',
        }),
    });

    server.start({
        ready: () => t.throws(
            // start again when already running
            () => server.start({
                ready: noop,
                connection: noop,
                close: noop,
            }),
            /started/,
        ),
        connection: noop,
        close: noop,
    });
});

test('server.start() - when SHUTDOWN', (t) => {
    t.plan(1);

    const server = new MuNetSocketServer({
        tcpServer: tcp.createServer(),
        udpServer: udp.createSocket({
            type: 'udp4',
        }),
    });

    server.start({
        // close when running
        ready: () => server.close(),
        connection: noop,
        close: () => t.throws(
            // start again when already shut down
            () => server.start({
                ready: noop,
                connection: noop,
                close: noop,
            }),
            /started/,
        ),
    });
});

test('server.close() - when INIT', (t) => {
    const server = new MuNetSocketServer({
        tcpServer: tcp.createServer(),
        udpServer: udp.createSocket({
            type: 'udp4',
        }),
    });

    server.close();
    t.equal(server.state(), MuSocketServerState.SHUTDOWN, 'should change state to SHUTDOWN');
    t.end();
});

test('server.close() - when RUNNING', (t) => {
    t.plan(2);

    const tcpServer = tcp.createServer();
    const server = new MuNetSocketServer({
        tcpServer,
        udpServer: udp.createSocket({
            type: 'udp4',
        }),
    });

    tcpServer.listen();
    server.start({
        // close when running
        ready: () => server.close(),
        connection: noop,
        close: (error) => {
            t.equal(error, undefined, 'should not invoke close handler with an error');
            t.equal(server.state(), MuSocketServerState.SHUTDOWN, 'should change state to SHUTDOWN');
        },
    });
});

test('server.close() - when SHUTDOWN', (t) => {
    t.plan(1);

    const tcpServer = tcp.createServer();
    const server = new MuNetSocketServer({
        tcpServer,
        udpServer: udp.createSocket({
            type: 'udp4',
        }),
    });

    tcpServer.listen();
    server.start({
        // close when running
        ready: () => server.close(),
        connection: noop,
        close: () => {
            // close again when already shut down
            server.close();
            t.ok(true, 'should not invoke close handler');
        },
    });
});
