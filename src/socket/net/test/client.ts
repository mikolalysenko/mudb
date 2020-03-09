import test = require('tape');

import tcp = require('net');
import udp = require('dgram');

import getFreePort = require('../../util/get-free-port');
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
    tcpServerPort = tcpServer.address().port;
    console.log(`TCP server running on ${tcpServer.address().address}:${tcpServer.address().port}`);
});
getFreePort((port) => {
    udpServer.bind(
        {
            port,
            address: UDP_HOST_ADDR,
        },
        () => console.log(`UDP server running on ${udpServer.address().address}:${udpServer.address().port}`),
    );
});

socketServer.start({
    ready: () => {
        getFreePort((udpPort) => {
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

        getFreePort((udpPort) => {
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

        getFreePort((udpPort) => {
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

        getFreePort((udpPort) => {
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

        getFreePort((udpPort) => {
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

        getFreePort((udpPort) => {
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

        getFreePort((udpPort) => {
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
