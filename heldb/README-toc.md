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
const createClient = require('heldb/client')
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

## protocols ##
The first step to creating any application with `heldb` is to specify a protocol schema using [`helschema`](https://github.com/mikolalysenko/heldb/tree/master/helschema).  Each protocol then specifies two protocol interfaces, one for the client and one for the server.  A protocol interface is an object with the following properties:

* `state` which defines the state protocol
* `message` which is an object containing all message types and their arguments
* `rpc` which is an object containing all rpc types and their arguments

**Example:**

Here is a protocol for a simple game with a chat server

```javascript
const HelVoid = require('helschema/void')
const HelFloat = require('helschema/float64')
const HelStruct = require('helschema/struct')
const HelString = require('helschema/string')
const HelDictionary = require('helschema/dictionary')

const Vec2 = HelStruct({
    x: HelFloat(),
    y: HelFLoat()
})

const Agent = HelStruct({
    position: Vec2,
    velocity: Vec2,
    name: HelString('player')
})

module.exports = {
    client: {
        state: Agent,
        message: {
            chat: HelStruct({
                sender: HelString(),
                message: HelString()
            }
        },
        rpc: {}
    },
    server: {
        state: HelDictionary(Agent),
        message: {
            chat: HelString()
        },
        rpc: {
            setName:[HelString(), HelVoid()]
        }
    }
}
```

## server ##
A server in `heldb` processes messages from many clients.  It may choose to accept or reject incoming connections and 

### server constructor ###
`heldb/server` exports the constructor for the server.  It takes an object which accepts the following arguments:

* `protocol` which is a protocol schema as described above (see [`helschema`](FIXME) for more details)
* `socketServer` a `helnet` socket server instance (see [`helnet`](FIXME) for more details)
* `windowLength` an optional parameter describing the number of states to buffer

**Example:**

```javascript
const server = require('heldb/server')({
    socketServer: ..., // some socket server interface created by helnet
    protocol
})
```

### server events ###
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


## client ##

### client constructor ###

```javascript
const client = require('heldb/client')({
    socket,
    protocol
})
```

### client events ###

* `ready()`
* `message`
* `rpc`
* `state()`
* `close()`

## state ##

## rpc ##

## messages ##

### broadcast ###

# usage tips #

# more examples #

# TODO

* more test cases