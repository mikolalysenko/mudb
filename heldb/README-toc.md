# heldb
A database for HTML5 multiplayer games.

## example
This is an example showing how to create a server/client pair and protocol using `heldb` using different network interfaces.

**`procotol.js`**
```javascript
const HelFloat64 = require('helschema/float64')
const HelStruct = require('helschema/struct')
const HelDictionary = require('helschema/dictionary')

const Point = HelStruct({
    x: HelFloat64(),
    y: HelFloat64()
})

module.exports = {
    client: {
        state: Point,
        message: {},
        rpc: {},
    },
    server: {
        state: HelDictionary(Entity),
        message: {},
        rpc: {},
    },
}
```

**`server.js`**
```javascript
const createServer = require('heldb/server')

module.exports = function (socketServer) {
    const server = createServer({
        protocol: require('./protocol'),
        socketServer
    })

    return server.start({
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
    })
}
```

**`client.js`**
```javascript
const createClient = require('heldb/client')

module.exports = function (socket) {
    const client = createClient({
        protocol: require('./protocol'),
        socket
    })

    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const context = canvas.getContext('2d');
    document.body.appendChild(canvas);

    return client.start({
        message: {},
        rpc: {},
        ready (err?:any) {
            if (!err) {
                canvas.addEventListener('mousemove', (ev) => {
                    const bounds = canvas.getBoundingClientRect()
                    client.state.x = ev.clientX - bounds.left
                    client.state.y = ev.clientY - bounds.top
                    client.commit()
                });
                draw()
            }
        },
        state () {},
        close () {
            document.body.removeChild(canvas)
        },
    })

    function draw () {
        if (!client.running || !context) {
            return;
        }

        // clear background
        context.fillStyle = '#000';
        context.fillRect(0, 0, 256, 256);

        // draw all objects in the game
        const state = client.server.state;
        Object.keys(state).forEach((id) => {
            if (id !== client.sessionId) {
                context.fillStyle = '#fff';
                context.fillRect(state[id].x - 2.5, state[id].y - 2.5, 5, 5);
            }
        });

        // draw client cursor
        context.fillStyle = '#f00';
        context.fillRect(client.state.x - 3, client.state.y - 3, 6, 6);

        requestAnimationFrame(draw);
    }
}
```

**`example-local.js`**
```javascript
const { createLocalSocket, createLocalSocketServer } = require('helnet/local')
const exampleServer = require('./server')
const exampleClient = require('./client')

const socketServer = createLocalSocketServer()
exampleServer(socketServer)

const addClientButton = document.createElement('input');
addClientButton.value = 'add client';
addClientButton.type = 'button';
addClientButton.addEventListener('click', 
    () => exampleClient(createLocalSocket({
        sessionId: 'client' + Math.random(),
        socketServer    
    })));
```

**`example-ws-server.js`**
```javascript
// TODO
```

**`example-ws-client.js`**
```javascript
// TODO
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