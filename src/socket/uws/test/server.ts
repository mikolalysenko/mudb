import tape = require('tape');
import uWS = require('uWebSockets.js');
import { MuSocketServerState } from '../../socket';
import { MuUWSSocketServer } from '../server';

function noop () { }

tape('socketServer.start() when INIT', (t) => {
    t.plan(4);

    const server = uWS.App();
    const socketServer = new MuUWSSocketServer({ server });
    t.equal(socketServer.state(), MuSocketServerState.INIT, 'initial state should be INIT');

    socketServer.start({
        ready: () => {
            t.pass('should invoke ready handler');
            t.equal(socketServer.state(), MuSocketServerState.RUNNING, 'should change state to RUNNING when ready');
        },
        connection: noop,
        close: noop,
    });
    t.equal(socketServer.state(), MuSocketServerState.INIT, 'should not change state immediately');
});

tape('socketServer.start() when RUNNING', async (t) => {
    const server = uWS.App();
    const socketServer = new MuUWSSocketServer({ server });
    socketServer.start({
        ready: () => {
            t.throws(() => {
                socketServer.start({
                    ready: noop,
                    connection: noop,
                    close: noop,
                });
            });
            t.end();
        },
        connection: noop,
        close: noop,
    });
    socketServer.start({
        ready: () => {
            t.fail('start() should not be executed more than once');
        },
        connection: noop,
        close: noop,
    });
});

tape('socketServer.start() when SHUTDOWN', (t) => {
    const server = uWS.App();
    const socketServer = new MuUWSSocketServer({ server });
    socketServer.start({
        ready: () => {
            socketServer.close();
            t.throws(() => {
                socketServer.start({
                    ready: noop,
                    connection: noop,
                    close: noop,
                });
            });
            t.end();
        },
        connection: noop,
        close: noop,
    });
});

tape('socketServer.start() called twice', (t) => {
    const server = uWS.App();
    const socketServer = new MuUWSSocketServer({ server });
    socketServer.start({
        ready: () => {
            t.pass('start() should be executed only once');
            t.end();
        },
        connection: noop,
        close: noop,
    });
    socketServer.start({
        ready: () => {
            t.fail('start() should not be executed more than once');
        },
        connection: noop,
        close: noop,
    });
});

tape('socketServer.close() when INIT', (t) => {
    const server = uWS.App();
    const socketServer = new MuUWSSocketServer({ server });
    t.equal(socketServer.state(), MuSocketServerState.INIT);
    socketServer.close();
    t.equal(socketServer.state(), MuSocketServerState.SHUTDOWN, 'should change state to SHUTDOWN immediately');
    t.end();
});

tape('socketServer.close() when RUNNING', (t) => {
    t.plan(3);

    const server = uWS.App();
    const socketServer = new MuUWSSocketServer({ server });
    socketServer.start({
        ready: () => {
            t.equal(socketServer.state(), MuSocketServerState.RUNNING);
            socketServer.close();
            t.equal(socketServer.state(), MuSocketServerState.SHUTDOWN, 'should change state to SHUTDOWN immediately');
        },
        connection: noop,
        close: () => {
            t.pass('should invoke close handler only once');
        },
    });
});

tape('socketServer.close() when SHUTDOWN', (t) => {
    t.plan(1);

    let closed = false;

    const server = uWS.App();
    const socketServer = new MuUWSSocketServer({ server });
    socketServer.start({
        ready: () => {
            socketServer.close();
            t.equal(socketServer.state(), MuSocketServerState.SHUTDOWN);
            socketServer.close();
            t.end();
        },
        connection: noop,
        close: () => {
            if (closed) {
                t.fail('should not invoke close handler again');
            }
            closed = true;
        },
    });
});
