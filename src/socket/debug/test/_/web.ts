import test = require('tape');
import ip = require('ip');

import { MuWebSocket } from '../../../web/client';
import { MuDebugSocket } from '../../index';
import { MuClient } from '../../../../client';
import { protocolSchema } from './schema';

const url = `ws://${ip.address()}:${process.env.PORT}`;

const PING_OPCODE = 0x9;
const PONG_OPCODE = 0xA;

function randomId () {
    return Math.random().toString(36).substr(2);
}

test('WebSocket - simulating network latency on client side', (t) => {
    t.plan(2);

    let timestamp:number;
    const upstreamLatency = 75;
    const downstreamLatency = 25;

    const socket = new MuWebSocket({
        sessionId: randomId(),
        url,
    });
    const debugSocket = new MuDebugSocket({
        socket,
        outLatency: upstreamLatency,
        inLatency: downstreamLatency,
    });
    const muClient = new MuClient(debugSocket);

    const clientProtocol = muClient.protocol(protocolSchema);
    clientProtocol.configure({
        message: {
            pong: (data) => {
                const delay = Date.now() - timestamp;
                const latency = upstreamLatency + downstreamLatency;

                t.equal(data, PONG_OPCODE);
                t.ok(delay > latency, `client should receive opcode after >${latency} ms`);
            },
        },
    });

    muClient.start({
        ready: () => {
            clientProtocol.server.message.ping(PING_OPCODE);
            timestamp = Date.now();
        },
    });
});

test('WebSocket - maintaining order of messages from client side', (t) => {
    let head = 10;
    const end = 64;

    t.plan(end - head);

    const socket = new MuWebSocket({
        sessionId: randomId(),
        url,
    });
    const debugSocket = new MuDebugSocket({
        socket,
        outLatency: 75,
        outJitter: 10,
        inLatency: 25,
        inJitter: 10,
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
