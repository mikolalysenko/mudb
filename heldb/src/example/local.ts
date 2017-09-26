import HelFloat64 = require('helschema/float64');
import HelStruct = require('helschema/struct');
import HelDictionary = require('helschema/dictionary');
import { createSocketServer, createSocket } from 'helnet';
import createClient = require('../client');
import createServer = require('../server');

const Entity = HelStruct({
    x: HelFloat64(),
    y: HelFloat64(),
});

const protocol = {
    client: {
        state: Entity,
        message: {},
        rpc: {},
    },
    server: {
        state: HelDictionary(Entity),
        message: {
            splat: Entity,
        },
        rpc: {},
    },
};

const socketServer = createSocketServer({
    local: {},
});

const server = createServer({
    protocol,
    socketServer,
});

server.start({
    message: {
        splat(client, entity) {
            console.log('splat', entity);
            server.state[client.sessionId] = Entity.clone(entity);
            server.commit();
        },
    },
    rpc: {
    },
    ready() {
    },
    connect(client) {
    },
    state(client, state, tick) {
    },
    disconnect(client) {
    },
});

function startClient () {
    const socket = createSocket({
        sessionId: Math.random() + 'client',
        local: {
            server: socketServer,
        },
    });

    const client = createClient({
        protocol,
        socket,
    });

    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const context = canvas.getContext('2d');

    function draw () {
        if (!context) {
            return;
        }
        context.fillStyle = '#000';
        context.fillRect(0, 0, 256, 256);

        const state = client.server.state;
        Object.keys(state).forEach((name) => {
            const entity = state[name];

            context.fillStyle = '#fff';
            context.fillRect(entity.x - 2.5, entity.y - 2.5, 5, 5);
        });

        requestAnimationFrame(draw);
    }

    document.body.appendChild(canvas);

    client.start({
        message: {
        },
        rpc: {
        },
        ready (err?:any) {
            if (err) {
                return;
            }
            canvas.addEventListener('click', (ev) => {
                console.log('click');
                const bounds = canvas.getBoundingClientRect();
                client.server.message.splat({
                    x: ev.clientX - bounds.left,
                    y: ev.clientY - bounds.top,
                });
            });
            draw();
        },
        state (state) {
            console.log('server state updated!', state);
        },
        close () {
        },
    });
}

const addClientButton = document.createElement('input');
addClientButton.value = 'add client';
addClientButton.type = 'button';
addClientButton.addEventListener('click', startClient);
document.body.appendChild(addClientButton);