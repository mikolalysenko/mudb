import test = require('tape');
import { MuWorkerSocket } from '../socket';
import { MuSocketState } from 'mudb/socket';

function noop () { }

function id () {
    return Math.random().toString(36).substr(2);
}

function dummyWorker () {
    const workerURL = URL.createObjectURL(new Blob([], { type: 'text/javascript' }));
    const dummy = new Worker(workerURL);

    URL.revokeObjectURL(workerURL);
    dummy.terminate();

    return dummy;
}

test('workerSocket initial state', (t) => {
    const socket = new MuWorkerSocket(id(), dummyWorker());
    t.equal(socket.state, MuSocketState.INIT, 'should be MuSocketState.INIT');
    t.end();
});

test('workerSocket.open() - when INIT', (t) => {
    t.plan(2);

    const socket = new MuWorkerSocket(id(), dummyWorker());
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

    const socket = new MuWorkerSocket(id(), dummyWorker());
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

    const socket = new MuWorkerSocket(id(), dummyWorker());
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

    const socket = new MuWorkerSocket(id(), dummyWorker());
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
    const socket = new MuWorkerSocket(id(), dummyWorker());
    // close socket when init
    socket.close();
    t.equal(socket.state, MuSocketState.CLOSED, 'should change state to MuSocketState.CLOSED');
    t.end();
});

test('workerSocket.close() - when CLOSED', (t) => {
    const socket = new MuWorkerSocket(id(), dummyWorker());
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
