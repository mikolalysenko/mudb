# heldb
A database for HTML5 multiplayer games.

## example

```javascript
import { createSocketServer, createSocket } from 'helnet';
import createClient = require('../client');
import createServer = require('../server');

// First we define a protocol
import HelFloat64 = require('helschema/float64');
import HelStruct = require('helschema/struct');
import HelDictionary = require('helschema/dictionary');

const Entity = HelStruct({
    x: HelFloat64(),
    y: HelFloat64()
});

const protocol = {
    client: {
        state: Entity,
        message: {},
        rpc: {},
    },
    server: {
        state: HelDictionary(Entity),
        message: {},
        rpc: {},
    },
};


// Next we create a locally socket server
const socketServer = createSocketServer({
    local: {},
});


// We pass the protocol and socket server to the constructor of the server
const server = createServer({
    protocol,
    socketServer,
});

// Then we initialize the server
server.start({
    message: {},
    rpc: {},
    ready() {},
    connect(client) {
        server.state[client.sessionId] = client.schema.clone(client.state);
        server.commit();
    },
    state(client) {
        const serverEntity = server.state[client.sessionId];
        const clientEntity = client.state;
        serverEntity.x = clientEntity.x;
        serverEntity.y = clientEntity.y;
        server.commit();
    },
    disconnect(client) {
        delete server.state[client.sessionId];
        server.commit();
    },
});

// next we create a button to add clients to the server
const addClientButton = document.createElement('input');
addClientButton.value = 'add client';
addClientButton.type = 'button';
addClientButton.addEventListener('click', startClient);
document.body.appendChild(addClientBUtton);

function startClient () {
    // First we create a canvas element to draw the client
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const context = canvas.getContext('2d');
    document.body.appendChild(canvas);

    // First we create a new client object
    const client = createClient({
        protocol,
        socket: createSocket({
            sessionId: Math.random() + 'client',
            local: {
                server: socketServer,
            },
        }),
    });

    // Then we start the client and register our event handlers
    client.start({
        message: {},
        rpc: {},
        ready (err?:any) {
            if (err) {
                return;
            }
            canvas.addEventListener('mousemove', (ev) => {
                const bounds = canvas.getBoundingClientRect();
                client.state.x = ev.clientX - bounds.left;
                client.state.y = ev.clientY - bounds.top;
                client.commit();
            });
            draw();
        },
        state () {},
        close () {
            document.body.removeChild(container);
        },
    });

    function draw () {
        if (!context) {
            return;
        }
        context.fillStyle = '#000';
        context.fillRect(0, 0, 256, 256);

        const state = client.server.state;
        Object.keys(state).forEach((name) => {
            if (name === client.sessionId) {
                return;
            }

            const entity = state[name];

            context.fillStyle = '#fff';
            context.fillRect(entity.x - 2.5, entity.y - 2.5, 5, 5);
        });

        context.fillStyle = '#f00';
        context.fillRect(client.state.x - 3, client.state.y - 3, 6, 6);

        requestAnimationFrame(draw);
    }
}
```

# table of contents

# install #

```
npm install heldb helschema helnet
```

# api #

## protocols
The first step to creating any application with `heldb` is to specify a protocol schema using [`helschema`](https://github.com/mikolalysenko/heldb/tree/master/helschema).  Each protocol then specifies two protocol interfaces, one for the client and one for the server.  A protocol interface is an object with the following properties:

* `state` which defines the state protocol
* `message` which is an object containing all message types and their arguments
* `rpc` which is an object containing all rpc types and their arguments

**Example:**

```javascript
// TODO
```

## client ##

### constructor ###

**Example**

```javascript
// TODO
```

### event handlers ###

### sending data ###

## server ##

### constructor ###

### event handlers ###

# more examples #

# TODO

* more test cases