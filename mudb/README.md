# mudb
A database for HTML5 multiplayer games.

## example
This is heavily commented example showing how to create a server/client pair and protocol using `mudb`.  A system using `mudb` has to specify 3 things:

1. A protocol
1. A server
1. A client

Here is an example of a trivial game where many users can move a box around with their mouse, broken into 3 files:

### mouse game
First, we create a module which defines the network protocol called `protocol.js` here for simplicity:

**`procotol.js`**
```javascript
// Here we load in some basic schema types
const MuFloat64 = require('muschema/float64')
const MuStruct = require('muschema/struct')
const MuDictionary = require('muschema/dictionary')

// We define a point type using mustruct as a pair of floating point numbers
const Point = MuStruct({
    x: MuFloat64(),
    y: MuFloat64()
})

module.exports = {
    client: {
        state: Point,
        message: {},
        rpc: {},
    },
    server: {
        state: MuDictionary(Entity),
        message: {},
        rpc: {},
    },
}
```

Then, we define a server module.  This exports a function which takes a `munet` socketServer as input.

**`server.js`**
```javascript
const createServer = require('mudb/server')
const protocol = require('./protocol')

module.exports = function (socketServer) {
    const server = createServer({
        protocol,
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
const createClient = require('mudb/client')
const protocol = require('./protocol')

module.exports = function (socket) {
    const client = createClient({
        protocol,
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
const { createLocalSocket, createLocalSocketServer } = require('munet/local')
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
      * [2.1 protocols](#section_2.1)
      * [2.2 server](#section_2.2)
         * [2.2.1 server constructor](#section_2.2.1)
         * [2.2.2 server events](#section_2.2.2)
      * [2.3 client](#section_2.3)
         * [2.3.1 client constructor](#section_2.3.1)
         * [2.3.2 client events](#section_2.3.2)
      * [2.4 state](#section_2.4)
      * [2.5 rpc](#section_2.5)
      * [2.6 messages](#section_2.6)
         * [2.6.1 broadcast](#section_2.6.1)
   * [3 usage tips](#section_3)
   * [4 more examples](#section_4)

# <a name="section_1"></a> 1 install

```
npm install mudb muschema munet
```

# <a name="section_2"></a> 2 api

## <a name="section_2.1"></a> 2.1 protocols
The first step to creating any application with `mudb` is to specify a protocol schema using [`muschema`](https://github.com/mikolalysenko/mudb/tree/master/muschema).  Each protocol then specifies two protocol interfaces, one for the client and one for the server.  A protocol interface is an object with the following properties:

* `state` which defines the state protocol
* `message` which is an object containing all message types and their arguments
* `rpc` which is an object containing all rpc types and their arguments

**Example:**

Here is a protocol for a simple game with a chat server

```javascript
const MuVoid = require('muschema/void')
const MuFloat = require('muschema/float64')
const MuStruct = require('muschema/struct')
const MuString = require('muschema/string')
const MuDictionary = require('muschema/dictionary')

const Vec2 = MuStruct({
    x: MuFloat(),
    y: MuFLoat()
})

const Agent = MuStruct({
    position: Vec2,
    velocity: Vec2,
    name: MuString('player')
})

module.exports = {
    client: {
        state: Agent,
        message: {
            chat: MuStruct({
                sender: MuString(),
                message: MuString()
            }
        },
        rpc: {}
    },
    server: {
        state: MuDictionary(Agent),
        message: {
            chat: MuString()
        },
        rpc: {
            setName:[MuString(), MuVoid()]
        }
    }
}
```

## <a name="section_2.2"></a> 2.2 server
A server in `mudb` processes messages from many clients.  It may choose to accept or reject incoming connections and dispatch messages to clients as appropriate.

### <a name="section_2.2.1"></a> 2.2.1 server constructor
`mudb/server` exports the constructor for the server.  It takes an object which accepts the following arguments:

* `protocol` which is a protocol schema as described above (see [`muschema`](FIXME) for more details)
* `socketServer` a `munet` socket server instance (see [`munet`](FIXME) for more details)
* `windowLength` an optional parameter describing the number of states to buffer

**Example:**

```javascript
const server = require('mudb/server')({
    socketServer: ..., // some socket server interface created by munet
    protocol
})
```

### <a name="section_2.2.2"></a> 2.2.2 server events
Once a server is created, it is necessary to register event handlers and start the server.  This is done using the `server.start()` method.  This method takes an object that has the following properties:

* `ready()` which is called when the server is started
* `message` which is an object containing implementations of handlers for all of the message types
* `rpc` an object implementing all handlers for rpc types
* `connect(client)` called when a client connects to the server
* `state(client)` called when a new state update is recieved by a client
* `disconnect(client)` called when a client disconnects from the server

**Example:**

Working from the chat server schema above, here is a simple server for the above chat log

```javascript
server.start({
    ready() {
        console.log('server started')
    },
    message: {
        chat(client, msg) {
            server.broadcast.chat(server.state[client.sessionId].name, msg)
        }
    },
    rpc: {
        setName(client, name, cb) {
            const ids = Object.keys(server.state)
            for (let i = 0; i < ids.length; ++i) {
                if (server.state[ids[i]].name === name) {
                    return cb('name already in use')    
                }
            }
            server.state[client.sessionId].name = name
            return cb()
        }
    },
    connect(client) {
        server.state[client.sessionId] = client.schema.create()
        server.broadcast.chat('server', 'player joined')
        server.commit()
    },
    state(client) {
        const serverState = server.state[client.sessionId]
        const clientState = client.state

        serverState.position.x = clientState.position.x
        serverState.position.y = clientState.position.y
        serverState.velocity.x = clientState.velocity.x
        serverState.velocity.y = clientState.velocity.y

        server.commit()
    },
    disconnect(client) {
        delete server.state[client.sessionId]
        server.commit()
    }
})
```


## <a name="section_2.3"></a> 2.3 client

### <a name="section_2.3.1"></a> 2.3.1 client constructor

```javascript
const client = require('mudb/client')({
    socket,
    protocol
})
```

### <a name="section_2.3.2"></a> 2.3.2 client events

* `ready()`
* `message`
* `rpc`
* `state()`
* `close()`

## <a name="section_2.4"></a> 2.4 state

## <a name="section_2.5"></a> 2.5 rpc

## <a name="section_2.6"></a> 2.6 messages

### <a name="section_2.6.1"></a> 2.6.1 broadcast

# <a name="section_3"></a> 3 usage tips

# <a name="section_4"></a> 4 more examples

# TODO

* more test cases

