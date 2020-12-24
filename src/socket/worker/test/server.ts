import * as test from 'tape';
import { createWorkerSocketServer } from '../server';
import { MuSocketServerState } from '../../socket';

function noop () { }

test('workerSocketServer initial state', (t) => {
    const server = createWorkerSocketServer();
    t.equal(server.state(), MuSocketServerState.INIT, 'should be MuSocketServerState.INIT');
    t.end();
});

test('workerSocketServer.start() - when INIT', (t) => {
    t.plan(2);

    const server = createWorkerSocketServer();
    server.start({
        ready: () => {
            t.ok(true, 'should invoke ready handler');
            t.equal(server.state(), MuSocketServerState.RUNNING, 'should change state to MuSocketServerState.RUNNING');
        },
        connection: noop,
        close: noop,
    });
});

test('workerSocketServer.start() - when RUNNING', (t) => {
    t.plan(1);

    const server = createWorkerSocketServer();
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

    const server = createWorkerSocketServer();
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

    const server = createWorkerSocketServer();
    server.start({
        // close server when running
        ready: () => server.close(),
        connection: noop,
        close: (error) => {
            t.equal(error, undefined, 'should invoke close handler with no error message');
            t.equal(server.state(), MuSocketServerState.SHUTDOWN, 'should change state to MuSocketServerState.SHUTDOWN');
        },
    });
});

test('workerSocketServer.close() - when INIT', (t) => {
    const server = createWorkerSocketServer();
    // close server when init
    server.close();
    t.equal(server.state(), MuSocketServerState.SHUTDOWN, 'should change state to MuSocketServerState.SHUTDOWN');
    t.end();
});

test('workerSocketServer.close() - when SHUTDOWN', (t) => {
    const server = createWorkerSocketServer();
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
