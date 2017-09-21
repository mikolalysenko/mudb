import tape = require('tape');

import {} from 'helschema';
import { createSocketServer, createSocket } from 'helnet';
import { createClient, createServer } from '../index';

const protocol = {};

const socketServer = createSocketServer({
    local: true
});

const server = createServer({
    protocol,
    socketServer
});

server.start({
    ready() {
    },
    tick() {
    },
    connect() {
    }
})

function createClient () {
    const socket = createSocket({
        local: {
            socketServer
        }
    });

    const client = createClient({
        protocol,
        socket
    });

    client.start({
        messages: {
        },
        rpc: {
        },
        ready () {
            function draw () {
                client.poll();
            }
        },
        tick () {
        }
    });
}

const addClientButton = document.createElement('input')
addClientButton.value = 'add client';
addClientButton.addEventListener('click', createClient);
document.body.appendChild(addClientButton)