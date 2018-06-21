import test = require('tape');
import {
    MuWorkerSocketServer,
    MuWorkerSocket,
} from '../server-socket';
import {
    MuSocketServerState,
    MuSocketState,
} from 'mudb/socket';

function noop () { }

test('workerSocketServer initial state', (t) => {
    const server = new MuWorkerSocketServer();
    t.equal(server.state, MuSocketServerState.INIT, 'should be MuSocketServerState.INIT');
    t.end();
});

test('workerSocketServer.start() - when INIT', (t) => {
    t.plan(2);

    const server = new MuWorkerSocketServer();
    server.start({
        ready: () => {
            t.ok(true, 'should invoke ready handler');
            t.equal(server.state, MuSocketServerState.RUNNING, 'should change state to MuSocketServerState.RUNNING');
        },
        connection: noop,
        close: noop,
    });
});

test('workerSocketServer.start() - when RUNNING', (t) => {
    t.plan(1);

    const server = new MuWorkerSocketServer();
    server.start({
        ready: () => t.throws(
            // start server when already running
            () => server.start({
                ready: noop,
                connection: noop,
                close: noop,
            }),
        ),
        connection: noop,
        close: noop,
    });
});

test('workerSocketServer.start() - when SHUTDOWN', (t) => {
    t.plan(1);

    const server = new MuWorkerSocketServer();
    server.start({
        // close server when running
        ready: () => server.close(),
        connection: noop,
        close: () => t.throws(
            // start server when already shut down
            () => server.start({
                ready: noop,
                connection: noop,
                close: noop,
            }),
        ),
    });
});

test('workerSocketServer.close() - when RUNNING', (t) => {
    t.plan(2);

    const server = new MuWorkerSocketServer();
    server.start({
        // close server when running
        ready: () => server.close(),
        connection: noop,
        close: (error) => {
            t.equal(error, undefined, 'should invoke close handler with no error message');
            t.equal(server.state, MuSocketServerState.SHUTDOWN, 'should change state to MuSocketServerState.SHUTDOWN');
        },
    });
});

test('workerSocketServer.close() - when INIT', (t) => {
    const server = new MuWorkerSocketServer();
    // close server when init
    server.close();
    t.equal(server.state, MuSocketServerState.SHUTDOWN, 'should change state to MuSocketServerState.SHUTDOWN');
    t.end();
});

test('workerSocketServer.close() - when SHUTDOWN', (t) => {
    const server = new MuWorkerSocketServer();
    server.start({
        // close server when running
        ready: () => server.close(),
        connection: noop,
        close: () => {
            // close server when already shut down
            server.close();

            t.ok(true, 'should not invoke close handler');
            t.end();
        },
    });
});

function id () {
    return Math.random().toString(36).substr(2);
}

const dummy = {
    postMessage: noop,
    close: noop,
    terminate: noop,
};

test('workerSocket initial state', (t) => {
    const socket = new MuWorkerSocket(id(), dummy);
    t.equal(socket.state, MuSocketState.INIT, 'should be MuSocketState.INIT');
    t.end();
});

test('workerSocket.open() - when INIT', (t) => {
    t.plan(2);

    const socket = new MuWorkerSocket(id(), dummy);
    socket.open({
        ready: () => {
            t.ok(true, 'should invoke ready handler');
            t.equal(socket.state, MuSocketState.OPEN, 'should change state to MuSocketState.OPEN');
        },
        message: noop,
        close: noop,
    });
});

test('workerSocket.open() - when OPEN', (t) => {
    t.plan(1);

    const socket = new MuWorkerSocket(id(), dummy);
    socket.open({
        ready: () => t.throws(
            // open socket when already open
            () => socket.open({
                ready: noop,
                message: noop,
                close: noop,
            }),
        ),
        message: noop,
        close: noop,
    });
});

test('workerSocket.open() - when CLOSED', (t) => {
    t.plan(1);

    const socket = new MuWorkerSocket(id(), dummy);
    socket.open({
        // close socket when open
        ready: () => socket.close(),
        message: noop,
        close: () => t.throws(
            // open socket when already closed
            () => socket.open({
                ready: noop,
                message: noop,
                close: noop,
            }),
        ),
    });
});

test('workerSocket.close() - when OPEN', (t) => {
    t.plan(2);

    const socket = new MuWorkerSocket(id(), dummy);
    socket.open({
        // close socket when open
        ready: () => socket.close(),
        message: noop,
        close: (error) => {
            t.equal(error, undefined, 'should invoke close handler without error message');
            t.equal(socket.state, MuSocketState.CLOSED, 'should change state to MuSocketState.CLOSED');
        },
    });
});

test('workerSocket.close() - when INIT', (t) => {
    const socket = new MuWorkerSocket(id(), dummy);
    // close socket when init
    socket.close();
    t.equal(socket.state, MuSocketState.CLOSED, 'should change state to MuSocketState.CLOSED');
    t.end();
});

test('workerSocket.close() - when CLOSED', (t) => {
    const socket = new MuWorkerSocket(id(), dummy);
    socket.open({
        // close socket when open
        ready: () => socket.close(),
        message: noop,
        close: () => {
            // close socket when already closed
            socket.close();

            t.ok(true, 'should not invoke close handler');
            t.end();
        },
    });
});
