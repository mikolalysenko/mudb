# helnet
Networking abstractions for heldb.

Transportation:

* Local (via `setTimeout`)
* WebSockets
* WebWorkers (planned)
* WebRTC (planned)
* TCP/UDP (planned)
* File system (planned)

# example

## local

### server & client

```javascript
const server = require('require/server')({
    local: {}
})

server.start({
    ready () {
    }

    connection (socket) {
    }
})

const socket = require('helnet/socket')({
    sessionId: 'id' + Math.random(),
    local: {
        server
    }
})

socket.start({
    ready () {
    }

    message (message) {
    }

    unreliableMessage (message) {
    }

    close () {
    }
})
```

## websockets

### server

### client

# api

## socket

### constructor

#### `const socket = require('helnet/socket')(spec)`
Creates a new socket connection to a given server.  An exception is raised if the configuration is invalid.

##### `spec.sessionId`
A unique string identifying the session of the client.

##### `spec.local`

* `spec.local.server` a local server server instance

### properties

#### `socket.sessionId`
The socket's unique `sessionId` variable.

#### `socket.open`
Boolean flag.  If true, socket can accept `send` events.

### methods

#### `socket.start(spec)`
Starts the socket.  `spec` is a dictionary of callbacks with the following properties:

* `spec.read(err)` called when the socket is ready
* `spec.message(data)` called when the socket recieves a message
* `spec.unreliableMessage(data)` called when the socket receives an unreliable message
* `spec.close(err)` called when the socket closes

#### `socket.send(message)`
Sends a reliable, ordered message to the client.

#### `socket.sendUnreliable(message)`
Sends a message unreliably to the server.  This message may be dropped or reordered.

#### `socket.close()`
Closes the socket connection

## server API

### constructor

#### `const server = require('helnet/server')(spec)`

Constructs a new server object

##### `spec.local`

### properties

#### `server.clients`
An array of all currently connected clients

#### `server.open`
If true then `server` is open

### methods

#### `server.start(spec)`

* `spec.ready(err)`
* `spec.connection(socket)` called when a client connects.  `socket` is an instance of a socket like above

#### `server.close()`

Closes the server