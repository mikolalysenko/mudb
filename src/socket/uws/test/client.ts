import tape = require('tape');
import uWS = require('uWebSockets.js');
import { findPortAsync } from '../../../util/port';
import { MuSocketState } from '../../socket';
import { MuUWSSocketServer } from '../server';
import { MuUWSSocket } from '../client';

function noop () { }

function sessionId () : string {
    return Math.random().toString(36).substring(2);
}

tape('session id', async (t) => {
    const server = uWS.App();
    const socketServer = new MuUWSSocketServer({ server });

    const sid = 'abc`1234567890-=~!@#$%^&*()_+[]\;\',./{}|:"<>?xyz';
    const port = await findPortAsync();
    const socket = new MuUWSSocket({
        sessionId: sid,
        url: `ws://127.0.0.1:${port}`,
    });

    let listenSocket:uWS.us_listen_socket|null = null;

    socketServer.start({
        ready: () => {
            socket.open({
                ready: noop,
                message: noop,
                close: noop,
            });
        },
        connection: (sock) => {
            t.equal(sock.sessionId, sid, `should be escaped`);
            listenSocket && uWS.us_listen_socket_close(listenSocket);
            socketServer.close();
            t.end();
        },
        close: () => {},
    });
    server.listen(port, (token) => {
        if (token) {
            listenSocket = token;
        } else {
            throw new Error(`failed to listen to port ${port}`);
        }
    });
});
