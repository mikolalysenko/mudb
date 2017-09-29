# heldb
A database for HTML5 multiplayer games.

## example
This is heavily commented example showing how to create a server/client pair and protocol using `heldb`.  A system using `heldb` has to specify 3 things:

1. A protocol
1. A server
1. A client

Here is an example of a trivial game where many users can move a box around with their mouse, broken into 3 files:

### mouse game
First, we create a module which defines the network protocol called `protocol.js` here for simplicity:

**`procotol.js`**
```javascript
// Here we load in some basic schema types
const HelFloat64 = require('helschema/float64')
const HelStruct = require('helschema/struct')
const HelDictionary = require('helschema/dictionary')

// We define a point type using helstruct as a pair of floating point numbers
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

Then, we define a server module.  This exports a function which takes a `helnet` socketServer as input.

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
            // when a client connects we create a new entry in the player dictionary
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

Finally we create a client which renders the state of the world using HTML 5 canvas and collects user input:

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
    document.body.appendChild(canvas);
    const context = canvas.getContext('2d');

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
}
```

### running the game

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

   * [1 install](#section_1)
   * [2 api](#section_2)
      * [2.1 client](#section_2.1)
         * [2.1.1 constructor](#section_2.1.1)
         * [2.1.2 event handlers](#section_2.1.2)
         * [2.1.3 sending data](#section_2.1.3)
      * [2.2 server](#section_2.2)
         * [2.2.1 constructor](#section_2.2.1)
         * [2.2.2 event handlers](#section_2.2.2)
   * [3 more examples](#section_3)

# <a name="section_1"></a> 1 install

```
npm install heldb helschema helnet
```

# <a name="section_2"></a> 2 api

## protocols
The first step to creating any application with `heldb` is to specify a protocol schema using [`helschema`](https://github.com/mikolalysenko/heldb/tree/master/helschema).  Each protocol then specifies two protocol interfaces, one for the client and one for the server.  A protocol interface is an object with the following properties:

* `state` which defines the state protocol
* `message` which is an object containing all message types and their arguments
* `rpc` which is an object containing all rpc types and their arguments

**Example:**

```javascript
// TODO
```

## <a name="section_2.1"></a> 2.1 client

### <a name="section_2.1.1"></a> 2.1.1 constructor

**Example**

```javascript
// TODO
```

### <a name="section_2.1.2"></a> 2.1.2 event handlers

### <a name="section_2.1.3"></a> 2.1.3 sending data

## <a name="section_2.2"></a> 2.2 server

### <a name="section_2.2.1"></a> 2.2.1 constructor

### <a name="section_2.2.2"></a> 2.2.2 event handlers

# <a name="section_3"></a> 3 more examples

# TODO

* more test cases

