import { createLocalSocket, createLocalSocketServer } from 'mulocal-socket';

import { MuClient } from '../../client';
import { MuServer } from '../../server';

import { ChatClient } from './client';
import { ChatServer } from './server';

const socketServer = createLocalSocketServer();
const server = new MuServer(socketServer);
const chatServer = new ChatServer(server);
server.start();

function createClient () {
    const socket = createLocalSocket({
        sessionId: `id.${Math.random()}`,
        server: socketServer,
    });
    const client = new MuClient(socket);
    const container = document.createElement('div');
    const chatClient = new ChatClient(client, container);
    document.body.appendChild(container);

    client.start();
}

for (let i = 0; i < 4; ++i) {
    createClient();
}
