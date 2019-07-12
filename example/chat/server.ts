import tcp = require('net');
import udp = require('dgram');

import { MuNetSocketServer } from 'mudb/socket/net/server';
import { MuServer } from 'mudb/server';
import { ChatSchema } from './schema';

const tcpServer = tcp.createServer();
const udpServer = udp.createSocket({ type: 'udp4' });
const socketServer = new MuNetSocketServer({
    tcpServer,
    udpServer,
});
const server = new MuServer(socketServer);

const idToNick:{ [sessionId:string]:string } = {};

const protocol = server.protocol(ChatSchema);
protocol.configure({
    connect: () => { },
    disconnect: (client) => {
        const sessionId = client.sessionId;
        protocol.broadcast.notice(`${idToNick[sessionId]} has left`);
        delete idToNick[sessionId];
    },
    message: {
        join: (client, nickname) => {
            idToNick[client.sessionId] = nickname;
            protocol.broadcast.notice(`${nickname} has joined`);
        },
        say: (client, msg) => {
            protocol.broadcast.chat({
                name: idToNick[client.sessionId],
                msg,
            });
        },
        nick: (client, nickname) => {
            const sessionId = client.sessionId;
            protocol.broadcast.notice(`${idToNick[sessionId]} is now known as ${nickname}`);
            idToNick[sessionId] = nickname;
        },
    },
    close: () => {
        console.log('server closed');
    },
});

tcpServer.listen(9977, '127.0.0.1', () => {
    console.log(`server listening on port ${tcpServer.address().port}...`);
});
udpServer.bind(9988, '127.0.0.1');
server.start();
