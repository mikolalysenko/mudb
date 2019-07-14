import readline = require('readline');

import { MuNetSocket } from 'mudb/socket/net/client';
import { MuClient } from 'mudb/client';
import { ChatSchema } from './schema';

const socket = new MuNetSocket({
    sessionId: Math.random().toString(36).substring(2),
    // for TCP connection
    connectOpts: {
        host: '127.0.0.1',
        port: 9977,
    },
    // for UDP binding
    bindOpts: {
        address: '127.0.0.1',
        port: 9989,
    },
});
const client = new MuClient(socket);

let nickname:string;

// protocols should be defined and configured before
// client is started
const protocol = client.protocol(ChatSchema);
protocol.configure({
    ready: () => {
        protocol.server.message.join(nickname);

        readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: '',
        }).on('line', (msg) => {
            process.stdout.write('\x1b[1A\x1b[K');

            // change nickname
            if (/^\/nick /.test(msg)) {
                const m = msg.match(/^\/nick (.+)/);
                if (m) {
                    const nick = m[1];
                    protocol.server.message.nick(nick);
                    return;
                }
            }
            // say something
            protocol.server.message.say(msg);
        });
    },
    message: {
        chat: ({ name, msg }) => {
            console.log(`${name}: ${msg}`);
        },
        notice: (n) => {
            console.log(n);
        },
    },
    close: () => { },
});

const prompt = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});
prompt.question('Nickname: ', (n) => {
    nickname = n;
    prompt.close();
    client.start();
});
