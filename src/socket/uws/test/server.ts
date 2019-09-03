import test = require('tape');
import uWS = require('uWebSockets.js');

import { MuUWSSocketServer } from '../server';
import { MuSocketServerState } from '../../socket';

function noop () { }

test.onFinish(() => process.exit(0));
(<any>test).onFailure(() => process.exit(1));

test('server initial state', (t) => {
    const server = uWS.App();
    const socketServer = new MuUWSSocketServer({ server });
    t.equal(socketServer.state, MuSocketServerState.INIT, 'should be INIT');
    t.end();
});

test('socketServer.start() when INIT', (t) => {
    t.plan(3);

    const server = uWS.App();
    const socketServer = new MuUWSSocketServer({ server });
    socketServer.start({
        ready: () => {
            t.equal(socketServer.state, MuSocketServerState.RUNNING, 'should change state to RUNNING');
            t.pass('should invoke ready handler only once');
            t.end();
        },
        connection: noop,
        close: noop,
    });
    t.equal(socketServer.state, MuSocketServerState.INIT, 'should not change state immediately');
});

test('socketServer.start() when RUNNING', (t) => {
    t.plan(2);

    const server = uWS.App();
    const socketServer = new MuUWSSocketServer({ server });
    socketServer.start({
        ready: () => {
            t.equal(socketServer.state, MuSocketServerState.RUNNING);
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

test('socketServer.start() when SHUTDOWN', (t) => {
    t.plan(2);

    const server = uWS.App();
    const socketServer = new MuUWSSocketServer({ server });
    socketServer.start({
        ready: () => {
            socketServer.close();
            t.equal(socketServer.state, MuSocketServerState.SHUTDOWN);
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

test('socketServer.close() when INIT', (t) => {
    const server = uWS.App();
    const socketServer = new MuUWSSocketServer({ server });
    t.equal(socketServer.state, MuSocketServerState.INIT);
    socketServer.close();
    t.equal(socketServer.state, MuSocketServerState.SHUTDOWN, 'should change state to SHUTDOWN immediately');
    t.end();
});

test('socketServer.close() when RUNNING', (t) => {
    t.plan(3);

    const server = uWS.App();
    const socketServer = new MuUWSSocketServer({ server });
    socketServer.start({
        ready: () => {
            t.equal(socketServer.state, MuSocketServerState.RUNNING);
            socketServer.close();
            t.equal(socketServer.state, MuSocketServerState.SHUTDOWN, 'should change state to SHUTDOWN immediately');
            t.end();
        },
        connection: noop,
        close: () => {
            t.pass('should invoke close handler only once');
        },
    });
});

test('socketServer.close() when SHUTDOWN', (t) => {
    t.plan(1);

    let closed = false;

    const server = uWS.App();
    const socketServer = new MuUWSSocketServer({ server });
    socketServer.start({
        ready: () => {
            socketServer.close();
            t.equal(socketServer.state, MuSocketServerState.SHUTDOWN);
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
