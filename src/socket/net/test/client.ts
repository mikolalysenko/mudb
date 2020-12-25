import * as test from 'tape';

import * as tcp from 'net';
import * as udp from 'dgram';

import { findPort } from '../../../util/port';
import { MuNetSocketServer } from '../server';
import { MuNetSocket } from '../client';
import { MuSocketState } from '../../socket';

function noop () { }

function randomId () {
    return Math.random().toString(36).substr(2);
}

test.onFinish(() => process.exit(0));

// initiate servers
const tcpServer = tcp.createServer();
const udpServer = udp.createSocket({
    type: 'udp4',
});
const socketServer = new MuNetSocketServer({
    tcpServer,
    udpServer,
});

const UDP_HOST_ADDR = '127.0.0.1';

// run servers
let tcpServerPort;
tcpServer.listen(() => {
    const addr:any = tcpServer.address();
    if (typeof addr === 'string') {
        tcpServerPort = +addr;
        console.log(`TCP server running on ${addr}`);
    } else {
        tcpServerPort = addr.port;
        console.log(`TCP server running on ${addr.address}:${addr.port}`);
    }
});
findPort((port) => {
    udpServer.bind(
        {
            port,
            address: UDP_HOST_ADDR,
        },
        () => console.log(`UDP server running on ${'' + udpServer.address()}`),
    );
});

socketServer.start({
    ready: () => {
        findPort((udpPort) => {
            test('socket initial state', (t) => {
                const socket = new MuNetSocket({
                    sessionId: randomId(),
                    connectOpts: {
                        port: tcpServerPort,
                    },
                    bindOpts: {
                        port: udpPort,
                    },
                });

                t.equal(socket.state(), MuSocketState.INIT, 'should be INIT');
                t.end();
            });
        });

        findPort((udpPort) => {
            test('socket.open() - when INIT', (t) => {
                t.plan(2);

                const socket = new MuNetSocket({
                    sessionId: randomId(),
                    connectOpts: {
                        port: tcpServerPort,
                    },
                    bindOpts: {
                        port: udpPort,
                    },
                });

                socket.open({
                    ready: () => {
                        t.ok(true, 'should invoke ready handler');
                        t.equal(socket.state(), MuSocketState.OPEN, 'should change state to OPEN');
                    },
                    message: noop,
                    close: noop,
                });
            });
        });

        findPort((udpPort) => {
            test('socket.open() - when OPEN', (t) => {
                t.plan(1);

                const socket = new MuNetSocket({
                    sessionId: randomId(),
                    connectOpts: {
                        port: tcpServerPort,
                    },
                    bindOpts: {
                        port: udpPort,
                    },
                });

                socket.open({
                    ready: () => t.throws(
                        // open again when already open
                        () => socket.open({
                            ready: noop,
                            message: noop,
                            close: noop,
                        }),
                        /opened/,
                    ),
                    message: noop,
                    close: noop,
                });
            });
        });

        findPort((udpPort) => {
            test('socket.open() - when CLOSED', (t) => {
                t.plan(1);

                const socket = new MuNetSocket({
                    sessionId: randomId(),
                    connectOpts: {
                        port: tcpServerPort,
                    },
                    bindOpts: {
                        port: udpPort,
                    },
                });

                socket.open({
                    // close when open
                    ready: () => socket.close(),
                    message: noop,
                    close: () => t.throws(
                        // open again when already closed
                        () => socket.open({
                            ready: noop,
                            message: noop,
                            close: noop,
                        }),
                        /opened/,
                    ),
                });
            });
        });

        findPort((udpPort) => {
            test('socket.close() - when INIT', (t) => {
                const socket = new MuNetSocket({
                    sessionId: randomId(),
                    connectOpts: {
                        port: tcpServerPort,
                    },
                    bindOpts: {
                        port: udpPort,
                    },
                });

                socket.close();
                t.equal(socket.state(), MuSocketState.CLOSED, 'should change state to CLOSED');
                t.end();
            });

        });

        findPort((udpPort) => {
            test('socket.close() - when OPEN', (t) => {
                t.plan(2);

                const socket = new MuNetSocket({
                    sessionId: randomId(),
                    connectOpts: {
                        port: tcpServerPort,
                    },
                    bindOpts: {
                        port: udpPort,
                    },
                });

                socket.open({
                    // close when open
                    ready: () => socket.close(),
                    message: noop,
                    close: () => {
                        t.ok(true, 'should invoke close handler');
                        t.equal(socket.state(), MuSocketState.CLOSED, 'should change state to CLOSED');
                    },
                });
            });
        });

        findPort((udpPort) => {
            test('socket.close() - when CLOSED', (t) => {
                t.plan(1);

                const socket = new MuNetSocket({
                    sessionId: randomId(),
                    connectOpts: {
                        port: tcpServerPort,
                    },
                    bindOpts: {
                        port: udpPort,
                    },
                });

                socket.open({
                    // close when open
                    ready: () => socket.close(),
                    message: noop,
                    close: () => {
                        // close again when already closed
                        socket.close();
                        t.ok(true, 'should not invoke close handler');
                    },
                });
            });
        });
    },
    connection: noop,
    close: noop,
});
