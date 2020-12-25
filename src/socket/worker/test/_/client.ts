import * as work from 'webworkify';
import * as test from 'tape';
import { MuWorkerSocket } from '../../client';
import { MuSocketState } from '../../../socket';

function noop () { }

function sessionId () {
    return Math.random().toString(36).substr(2);
}

function serverWorker () : Worker {
    return work(require('./worker'));
}

test('workerSocket initial state', (t) => {
    const socket = new MuWorkerSocket(sessionId(), serverWorker());
    t.equal(socket.state(), MuSocketState.INIT, 'should be MuSocketState.INIT');
    t.end();
});

test('workerSocket.open() - when INIT', (t) => {
    t.plan(2);

    const socket = new MuWorkerSocket(sessionId(), serverWorker());
    socket.open({
        ready: () => {
            t.ok(true, 'should invoke ready handler');
            t.equal(socket.state(), MuSocketState.OPEN, 'should change state to MuSocketState.OPEN');
        },
        message: noop,
        close: noop,
    });
});

test('workerSocket.open() - when OPEN', (t) => {
    t.plan(1);

    const socket = new MuWorkerSocket(sessionId(), serverWorker());
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

    const socket = new MuWorkerSocket(sessionId(), serverWorker());
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

    const socket = new MuWorkerSocket(sessionId(), serverWorker());
    socket.open({
        // close socket when open
        ready: () => socket.close(),
        message: noop,
        close: (error) => {
            t.equal(error, undefined, 'should invoke close handler without error message');
            t.equal(socket.state(), MuSocketState.CLOSED, 'should change state to MuSocketState.CLOSED');
        },
    });
});

test('workerSocket.close() - when INIT', (t) => {
    const socket = new MuWorkerSocket(sessionId(), serverWorker());
    // close socket when init
    socket.close();
    t.equal(socket.state(), MuSocketState.CLOSED, 'should change state to MuSocketState.CLOSED');
    t.end();
});

test('workerSocket.close() - when CLOSED', (t) => {
    const socket = new MuWorkerSocket(sessionId(), serverWorker());
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
