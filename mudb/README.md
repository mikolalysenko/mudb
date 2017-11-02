# mudb
A database for HTML5 multiplayer games.

A `mudb` instance consists of multiple protocols which implement different behaviors between the server and client.  

## example
This is heavily commented example showing how to create a server/client pair and protocol using `mudb`.  Each `mudb` instance consists of a `MuServer` and several `MuClient`s.  Each node in the system consists of one or more protocols which define different behaviors.  To create a protocol a user must specify the following data:

1. A schema
1. A server
1. A client

Here is an example of a simple chat protocol:

### chat example

**schema.js**

```javascript
```

**server.js**

```javascript
```

**client.js**

```javascript
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
      * [2.4 messages](#section_2.4)
         * [2.4.1 broadcast](#section_2.4.1)
      * [2.5 socket interface](#section_2.5)
         * [2.5.1 properties](#section_2.5.1)
            * [2.5.1.1 `sessionId`](#section_2.5.1.1)
            * [2.5.1.2 `open`](#section_2.5.1.2)
         * [2.5.2 methods](#section_2.5.2)
            * [2.5.2.1 `start(spec)`](#section_2.5.2.1)
            * [2.5.2.2 `send(data:Uint8Array, unreliable?:boolean)`](#section_2.5.2.2)
            * [2.5.2.3 `close()`](#section_2.5.2.3)
      * [2.6 socket server interface](#section_2.6)
         * [2.6.1 properties](#section_2.6.1)
            * [2.6.1.1 `clients[]`](#section_2.6.1.1)
            * [2.6.1.2 `open`](#section_2.6.1.2)
         * [2.6.2 method](#section_2.6.2)
            * [2.6.2.1 `start()`](#section_2.6.2.1)
            * [2.6.2.2 `close()`](#section_2.6.2.2)
   * [3 usage tips](#section_3)
   * [4 helpful modules](#section_4)
   * [5 more examples](#section_5)

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
* `raw`
* `connect(client)` called when a client connects to the server
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
* `raw()`
* `close()`

## <a name="section_2.4"></a> 2.4 messages

### <a name="section_2.4.1"></a> 2.4.1 broadcast

## <a name="section_2.5"></a> 2.5 socket interface

`MuSocket` sockets are bidirectional sockets.  They support both reliable, ordered streams and unreliable optimisitic packet transfer.  

### <a name="section_2.5.1"></a> 2.5.1 properties

#### <a name="section_2.5.1.1"></a> 2.5.1.1 `sessionId`
A string representing a unique session id identifying the socket.

#### <a name="section_2.5.1.2"></a> 2.5.1.2 `open`
Boolean flag determing whether a socket is open or not.

### <a name="section_2.5.2"></a> 2.5.2 methods

#### <a name="section_2.5.2.1"></a> 2.5.2.1 `start(spec)`

* `ready()`
* `message(data:Uint8Array, unreliable:boolean)`
* `close()`

#### <a name="section_2.5.2.2"></a> 2.5.2.2 `send(data:Uint8Array, unreliable?:boolean)`

#### <a name="section_2.5.2.3"></a> 2.5.2.3 `close()`

## <a name="section_2.6"></a> 2.6 socket server interface

### <a name="section_2.6.1"></a> 2.6.1 properties

#### <a name="section_2.6.1.1"></a> 2.6.1.1 `clients[]`

#### <a name="section_2.6.1.2"></a> 2.6.1.2 `open`

### <a name="section_2.6.2"></a> 2.6.2 method

#### <a name="section_2.6.2.1"></a> 2.6.2.1 `start()`

#### <a name="section_2.6.2.2"></a> 2.6.2.2 `close()`

# <a name="section_3"></a> 3 usage tips

# <a name="section_4"></a> 4 helpful modules

# <a name="section_5"></a> 5 more examples

# TODO

* more test cases

# credits
Development supported by Shenzhen DianMao Digital Technology Co., Ltd.

<img src="https://raw.githubusercontent.com/mikolalysenko/mudb/master/img/logo.png" />

Written in Shenzhen, China.

(c) 2017 Mikola Lysenko, Shenzhen DianMao Digital Technology Co., Ltd.



