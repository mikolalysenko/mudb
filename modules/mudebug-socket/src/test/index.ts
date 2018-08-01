import test = require('tape');
import ip = require('ip');

import { MuWebSocket } from 'muweb-socket/socket';
import { MuDebugSocket } from '../index';
import { MuClient } from 'mudb/client';
import { protocolSchema } from './schema';

const url = `ws://${ip.address()}:${process.env.PORT}`;

const PING_OPCODE = 0x9;
const PONG_OPCODE = 0xA;

function sessionId () {
    return Math.random().toString(36).substr(2);
}

test('simulating laggy connection', (t) => {
    const socket = new MuWebSocket({
        sessionId: sessionId(),
        url,
    });
    const debugSocket = new MuDebugSocket({
        socket,
        latency: 250,
    });
    const muClient = new MuClient(debugSocket);

    let timestamp:number;

    const clientProtocol = muClient.protocol(protocolSchema);
    clientProtocol.configure({
        message: {
            pong: (data) => {
                const delay = Date.now() - timestamp;
                t.equal(data, PONG_OPCODE);
                t.ok(delay > debugSocket.latency, 'packet delay should be greater than spec.latency');
                t.end();
            },
        },
    });

    muClient.start({
        ready: () => {
            timestamp = Date.now();
            clientProtocol.server.message.ping(PING_OPCODE);
        },
    });
});

test('maintaining order of messages', (t) => {
    let head = 10;
    const end = 256;

    t.plan(end - head);

    const socket = new MuWebSocket({
        sessionId: sessionId(),
        url,
    });
    const debugSocket = new MuDebugSocket({
        socket,
        latency: 250,
        jitter: 100,
    });
    const muClient = new MuClient(debugSocket);

    const clientProtocol = muClient.protocol(protocolSchema);
    clientProtocol.configure({
        message: {
            pong: (data) => {
                t.equal(data, head++);
            },
        },
    });

    muClient.start({
        ready: () => {
            for (let i = head; i < end; ++i) {
                clientProtocol.server.message.ping(i);
            }
        },
    });
});
