import { createServer } from 'http';

import ip = require('ip');

import { MuWebSocketServer } from 'muweb-socket/server';
import { MuDebugServer } from '../index';
import { MuServer } from 'mudb/server';
import { protocolSchema } from './schema';

const PING_OPCODE = 0x9;
const PONG_OPCODE = 0xA;

const server = createServer();
const socketServer = new MuWebSocketServer({ server });
const debugSocketServer = new MuDebugServer({ socketServer });
const muServer = new MuServer(debugSocketServer);

muServer.protocol(protocolSchema).configure({
    message: {
        ping: (client, data, unreliable) => {
            const response = data === PING_OPCODE ? PONG_OPCODE : data;
            client.message.pong(response, !!unreliable);
        },
    },
});

const port = process.argv[2];
server.listen(port);
muServer.start({
    ready: () => {
        console.log(`listening on ${ip.address()}:${server.address().port}...`);
    },
});
