import { createLocalClient, createLocalServer } from 'munet/local/local';

import { MuClient } from '../../client';
import { MuServer } from '../../server';

import { ChatClient } from './client';
import { ChatServer } from './server';

const socketServer = createLocalServer({});
const server = new MuServer(socketServer);
const chatServer = new ChatServer(server);
server.start();

console.log('starting');

function createClient () {
    const socket = createLocalClient(`id.${Math.random()}`, {
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
