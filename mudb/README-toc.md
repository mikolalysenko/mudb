# mudb
A database for realtime server-client applications.

A `mudb` instance consists of multiple protocols which implement different behaviors between the server and client.

A *protocol* is a collection of message handlers which implement

## example
Here is a minimal chat room example showing how to create a server/client pair and protocol using `mudb`.  A `mudb` instance consists of one `MuServer` and several `MuClient`s.  Each node in the system consists of one or more protocols which define different behaviors.  To create a protocol a user must specify the following data:

1. A schema
2. A server protocol handler
3. A client protocol handler

**schema.js**

The first step of creating any applications with `mudb` is to specify a protocol schema using `muschema`.

```javascript
var muschema = require('muschema')
var MuStruct = muschema.MuStruct
var MuString = muschema.MuString

// A protocol schema always has two properties, `server` and `client`.
exports.ChatSchema = {
    // data layouts of different messages received by client
    client: {
        // data of each `chat` message contains
        // a `name` property of string type
        // a `text` property of string type
        chat: new MuStruct({
            name: new MuString(),
            text: new MuString(),
        }),
    },
    // data layouts of different messages received by server
    server: {
        // data of each `say` message is of string type
        say: new MuString(),
    },
}
```

**server.js**

```javascript
module.exports = function (server) {
    var protocol = server.protocol(require('./schema').ChatSchema)

    var clientNames = {}

    // specify server-side event handlers
    protocol.configure({
        // message handlers
        message: {
            // called when receiving a `say` message from client
            say: function (client, text) {
                // Broadcast a `chat` message to all clients.  The data
                // to be sent must conform to the structure defined by
                // `ChatSchema.client.chat`
                protocol.broadcast.chat({
                    name: clientNames[client.sessionId],
                    text: text,
                })
            },
        },
        // called when a client connects
        connect: function (client) {
            clientNames[client.sessionId] = client.sessionId
            protocol.broadcast.chat({
                name: 'server',
                text: clientNames[client.sessionId] + ' joined the channel',
            })
        },
        // called when a client disconnects
        disconnect: function (client) {
            protocol.broadcast.chat({
                name: 'server',
                text: clientNames[client.sessionId] + ' left',
            })
        },
    })

    // launch server after adding and configuring all protocols needed
    server.start()
}
```

**client.js**

```javascript
module.exports = function (client) {
    var messageDiv = document.createElement('div')
    var textLabel = document.createElement('label')
    var textInput = document.createElement('input')

    var protocol = client.protocol(require('./schema').ChatSchema)

    messageDiv.style.overflow = 'auto'
    messageDiv.style.width = '400px'
    messageDiv.style.height = '300px'

    textLabel.textContent = 'message: '

    textInput.type = 'text'
    textInput.style.width = '400px'
    textInput.style.padding = '0px'
    textInput.style.margin = '0px'

    document.body.appendChild(messageDiv)
    document.body.appendChild(document.createElement('br'))
    document.body.appendChild(textLabel)
    document.body.appendChild(textInput)

    // specify client-side event handlers
    protocol.configure({
        // called when client is ready to handle messages
        ready: function () {
            textInput.addEventListener('keydown', function (ev) {
                if (ev.keyCode === 13) {
                    // Send a `say` message to server.  Similarly, data
                    // to be sent must conform to the structure defined by
                    // `ChatSchema.server.say`
                    protocol.server.message.say(textInput.value)
                    textInput.value = ''
                }
            })
        },
        // message handlers
        message: {
            // called when receiving a `chat` message from server
            chat: function (data) {
                var name = data.name
                var text = data.text
                var textNode = document.createTextNode(name + ": " + text)
                messageDiv.appendChild(textNode)
                messageDiv.appendChild(document.createElement('br'))
            }
        }
    })

    // open client after adding and configuring all protocols needed
    client.start()
}
```

To run the example,

1. cd into the directory containing the three files above
2. `npm i mudo`
3. `mudo --socket websocket --open`

# table of contents

# install #
```
npm i mudb muweb-socket mulocal-socket
```

# api #

## interfaces ##

Purely instructive interfaces:

* `TableOf<T>`: `{ [messageName:string]:T } | {}`
* `ProtocolSchema`: `{ server:TableOf<AnyMuSchema>, client:TableOf<AnyMuSchema> }`
* `Dispatch`: `(data, unreliable?:boolean) => undefined`
* `SendRaw`: `(data:Uint8Array|string, unreliable?:boolean) => undefined`
* `ServerMessageHandler`: `(client:MuRemoteClient, data, unreliable?:boolean) => undefined`
* `ClientMessageHandler`: `(data, unreliable:boolean) => undefined`

### `MuSocket` ###
`MuSocket` sockets are bidirectional sockets.  They support both reliable, ordered streams and unreliable optimisitic packet transfer.

#### `sessionId` ####
A string representing a unique session id identifying the socket.

#### `open` ####
A boolean flag determing whether the socket is open or not.

#### `start(spec)` ####

* `spec:{ ready, message, close }`
    * `ready()`
    * `message(data:Uint8Array|string, unreliable:boolean)`
    * `close(error?)`

#### `send(data:Uint8Array|string, unreliable?:boolean)` ####

#### `close()` ####

### `MuSocketServer` ###

#### `clients:MuSocket[]` ####

#### `open` ####
A boolean flag determining whether the socket server is open or not.

#### `start(spec)` ####

* `spec:{ ready, connection, close }`
    * `ready()`
    * `connection(socket:MuSocket)`
    * `close(error?)`

#### `close()` ####

## `MuServer(socketServer:MuSocketServer)` ##

```javascript
var httpServer = require('http').createServer(/* ... */)
var socketServer = new require('muweb-socket').MuWebSocketServer(httpServer)
var muServer = new require('mudb').MuServer(socketServer)
```

### `protocol(schema:ProtocolSchema) : MuServerProtocol` ###
Adds a server protocol, and returns it to be configured.

A `MuServer` can have multiple protocols.  Note that you cannot add any new protocols after the server is started.

### `start(spec?)` ###
Launches server.

* `spec:{ ready?, close? }`
    * `ready()`: called when the underlying socket server is launched
    * `close(error?)`: called when the underlying socker server is shut down

### `destroy()` ###
Shuts down the underlying socket server and terminates all clients.  Useful when having multiple instances of `mudb`.

## `MuServerProtocol` ##

### `broadcast:TableOf<Dispatch>` ###
An object of methods, each of which broadcasts to all connected clients.  Each message (delta encoded) will be handled by a specific handler.  For example, the message sent by `protocol.broadcast.shower(shampoo, true)` will be handled by the `shower` method on the corresponding client protocol, as `shower(shampoo, true)`.  So this is effectively dispatching method calls to a remote object.

### `broadcastRaw:SendRaw`
A method that broadcasts to all connected clients with "raw" (not processed, contrary to delta) messages.  The messages will be handled by the raw message handler of the corresponding client protocol.

### `configure(spec)` ###
Each protocol should be configured before the server is started and can be configured only once, by specifying the event handlers in `spec`.

* `spec:{ message, ready?, connect?, raw?, disconnect?, close? }`
    * `message:TableOf<ServerMessageHandler>` required
    * `ready()` called when the underlying socket server is launched
    * `connect(client:MuRemoteClient)` called when a client connects
    * `raw(client:MuRemoteClient, data:Uint8Array|string, unreliable:boolean)` called when a "raw" message is received
    * `disconnect(client:MuRemoteClient)` called when a client disconnects
    * `close()` called when the underlying socket server is shut down

## `MuRemoteClient` ##
A `MuRemoteClient` is the server-side representation of a client, used in the event handlers.

### `sessionId` ###
A string representing a unique session id identifying the client.

### `message:TableOf<Dispatch>` ###
An object of methods, each of which sends messages (delta encoded) to the corresponding client.

### `sendRaw:SendRaw` ###
A method that sends "raw" messages to the corresponding client.

### `close()` ###
Closes the reliable socket.

## `MuClient(socket:MuSocket)` ##

```javascript
var socket = new require('muweb-socket/socket').MuWebSocket(spec)
var muClient = new require('mudb').MuClient(socket)
```

### `protocol(schema:ProtocolSchema) : MuClientProtocol` ###
Adds a client protocol, and returns it to be configured.

A `MuClient` can have multiple protocols.  Note that you cannot add any new protocols after the client is started.

### `start(spec?)` ###
Runs client.

* `spec:{ ready?, close? }`
    * `ready(error?:string)` called when the client is ready to handle messages
    * `close(error?:string)` called when all sockets are closed

These happen in the given order when `client.start()`:

0. client establishes a connection to server
1. client sends its session id
2. server receives session id and uses it to find related connection object
    * if connection object exists, responds with `{ reliable: false }`
    * otherwise, responds with `{ reliable: true }`
3. server then sends schema hash (packets will arrive at client in order)
4. client resets `onmessage` handler and `onclose` handler of underlying socket based on the value of `reliable`
5. client then receives and verifies schema hash
6. client sends schema hash
7. server receives and verifies schema hash

### `destroy()` ###
Closes all sockets.

## `MuClientProtocol` ##

### `server:MuRemoteServer` ###
The client-side representation of the server.

### `configure(spec)` ###
Each protocol should be configured before the client is started and can be configured only once, by specifying the event handlers in `spec`.

* `spec:{ message, ready?, raw?, close? }`
    * `message:TableOf<ClientMessageHandler>` required
    * `ready()` called when the client is ready to handle messages
    * `raw(data:Uint8Array|string, unreliable:boolean)` called when receiving a "raw" message
    * `close()` called when all sockets are closed

## `MuRemoteServer` ##

### `message:TableOf<Dispatch>` ###
An object of methods, each of which sends specific messages (delta encoded) to the server.

### `sendRaw:SendRaw`
A method that sends "raw" messages to the server.

# usage tips #

# helpful modules #

# more examples #

# TODO #

* more test cases

# credits
Development supported by Shenzhen DianMao Digital Technology Co., Ltd.

<img src="https://raw.githubusercontent.com/mikolalysenko/mudb/master/img/logo.png" />

Written in Shenzhen, China.

(c) 2017 Mikola Lysenko, Shenzhen DianMao Digital Technology Co., Ltd.
