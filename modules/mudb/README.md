# mudb
A database for real-time server-client applications.

A `mudb` application has one `MuServer` and several `MuClient`s.  Each node consists of one or more protocols which define different behaviors.

A *protocol* is essentially a collection of event handlers.  To define a protocol, typically you need to specify
1. a protocol schema
2. a server protocol
3. a client protocol

## example
Here is a minimal chat room demo, heavily documented to show how to define a protocol using `mudb`.

**schema.js**
The first step of creating any applications with `mudb` is to specify a protocol schema using `muschema`, defining the data structures of different messages that all parties agree on.

```javascript
var muschema = require('muschema')
var MuStruct = muschema.MuStruct
var MuString = muschema.MuString

// define a protocol schema, which always contains a `server` and a `client` property
exports.ChatSchema = {
    // define data structures of messages sent to client
    client: {
        // each `chat` message contains a record with
        // a `name` property of string type
        // a `text` property of string type
        // both should always be present
        chat: new MuStruct({
            name: new MuString(),
            text: new MuString(),
        }),
    },
    // define data structures of messages sent to server
    server: {
        // each `say` message contains a string
        say: new MuString(),
    },
}
```

**server.js**

```javascript
function randomName () {
    return Math.random().toString(36).substr(2, 11)
}

// `server` should be a `MuServer`
module.exports = function (server) {
    // create a protocol and add it to `server`
    var serverProtocol = server.protocol(require('./schema').ChatSchema)

    // a dictionary of clients' displayed names
    var clientNames = {}

    // configure protocol by specifying handlers
    serverProtocol.configure({
        // handlers for client messages
        message: {
            // whenever a client sends a `say` message (i.e. clientProtocol.server.message.say()),
            // server should broadcast the content to everyone, along with sender's displayed name
            say: function (client, content) {
                // fist argument of every client message handler is a reference
                // to client who sent the message

                // broadcast sender's name and text content, both of which are strings contained in a record,
                // as described in `ChatSchema.client.chat`, to all connected clients in a `chat` message
                serverProtocol.broadcast.chat({
                    name: clientNames[client.sessionId],
                    text: content,
                })
            },
        },
        // when a client connects, server should inform everyone
        connect: function (client) {
            // set client's displayed name to a random string
            clientNames[client.sessionId] = randomName()
            // also broadcast a `chat` message to all connected clients
            // except this time the message is from server
            serverProtocol.broadcast.chat({
                name: 'server',
                text: clientNames[client.sessionId] + ' joined the channel',
            })
        },
        // when a client disconnects, server should also inform everyone
        disconnect: function (client) {
            serverProtocol.broadcast.chat({
                name: 'server',
                text: clientNames[client.sessionId] + ' left',
            })
            // stop tracking client's displayed name
            delete clientNames[client.sessionId]
        },
    })

    // launch server after creating and configuring all protocols
    server.start()
}
```

**client.js**

```javascript
// `client` should be a `MuClient`
module.exports = function (client) {
    var messageDiv = document.createElement('div')
    var textLabel = document.createElement('label')
    var textInput = document.createElement('input')

    // create a protocol and add it to `client`
    var clientProtocol = client.protocol(require('./schema').ChatSchema)

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

    // configure protocol by specifying handlers
    clientProtocol.configure({
        // when client is ready to handle messages
        ready: function () {
            textInput.addEventListener('keydown', function (ev) {
                // when pressing `enter` on the input box
                if (ev.keyCode === 13) {
                    // send a `say` message to server
                    // the message being sent contains the text in the input box,
                    // a string, as described by `ChatSchema.server.say`
                    clientProtocol.server.message.say(textInput.value)
                    // empty input box
                    textInput.value = ''
                }
            })
        },
        // handlers for server messages
        message: {
            // whenever server sends a `chat` message (e.g. serverProtocol.broadcast.chat()),
            chat: function (data) {
                // which contains name of whoever said something and the content
                var name = data.name
                var text = data.text

                // print name and content out in message box
                var textNode = document.createTextNode(name + ": " + text)
                messageDiv.appendChild(textNode)
                messageDiv.appendChild(document.createElement('br'))
            }
        }
    })

    // open client after creating and configuring all protocols
    client.start()
}
```

To run the demo,

1. cd into the directory containing the three files above
2. `npm i mudo`
3. `mudo --socket websocket --open`

# table of contents

   * [1 install](#section_1)
   * [2 api](#section_2)
      * [2.1 interfaces](#section_2.1)
         * [2.1.1 `MuSocket`](#section_2.1.1)
            * [2.1.1.1 `sessionId:string`](#section_2.1.1.1)
            * [2.1.1.2 `open:boolean`](#section_2.1.1.2)
            * [2.1.1.3 `start(spec)`](#section_2.1.1.3)
            * [2.1.1.4 `send(data:Uint8Array|string, unreliable?:boolean)`](#section_2.1.1.4)
            * [2.1.1.5 `close()`](#section_2.1.1.5)
         * [2.1.2 `MuSocketServer`](#section_2.1.2)
            * [2.1.2.1 `clients:MuSocket[]`](#section_2.1.2.1)
            * [2.1.2.2 `open:boolean`](#section_2.1.2.2)
            * [2.1.2.3 `start(spec)`](#section_2.1.2.3)
            * [2.1.2.4 `close()`](#section_2.1.2.4)
      * [2.2 `MuServer(socketServer:MuSocketServer)`](#section_2.2)
         * [2.2.1 `protocol(schema:ProtocolSchema) : MuServerProtocol`](#section_2.2.1)
         * [2.2.2 `start(spec?)`](#section_2.2.2)
         * [2.2.3 `destroy()`](#section_2.2.3)
      * [2.3 `MuServerProtocol`](#section_2.3)
         * [2.3.1 `broadcast:TableOf<DispatchFn>`](#section_2.3.1)
         * [2.3.2 `configure(spec)`](#section_2.3.2)
      * [2.4 `MuRemoteClient`](#section_2.4)
         * [2.4.1 `sessionId`](#section_2.4.1)
         * [2.4.2 `message:TableOf<DispatchFn>`](#section_2.4.2)
         * [2.4.3 `sendRaw:SendRawFn`](#section_2.4.3)
         * [2.4.4 `close()`](#section_2.4.4)
      * [2.5 `MuClient(socket:MuSocket)`](#section_2.5)
         * [2.5.1 `protocol(schema:ProtocolSchema) : MuClientProtocol`](#section_2.5.1)
         * [2.5.2 `start(spec?)`](#section_2.5.2)
         * [2.5.3 `destroy()`](#section_2.5.3)
      * [2.6 `MuClientProtocol`](#section_2.6)
         * [2.6.1 `server:MuRemoteServer`](#section_2.6.1)
         * [2.6.2 `configure(spec)`](#section_2.6.2)
      * [2.7 `MuRemoteServer`](#section_2.7)
         * [2.7.1 `message:TableOf<DispatchFn>`](#section_2.7.1)
   * [3 usage tips](#section_3)
   * [4 helpful modules](#section_4)
   * [5 more examples](#section_5)
   * [6 TODO](#section_6)

# <a name="section_1"></a> 1 install
```
npm i mudb muweb-socket mulocal-socket
```

# <a name="section_2"></a> 2 api

## <a name="section_2.1"></a> 2.1 interfaces

Purely instructive types used to describe the API:
* `TableOf<T>`: `{ [messageName:string]:T } | {}`
* `ProtocolSchema`: `{ server:TableOf<AnyMuSchema>, client:TableOf<AnyMuSchema> }`
* `DispatchFn`: `(data, unreliable?:boolean) => undefined`
* `SendRawFn`: `(data:Uint8Array|string, unreliable?:boolean) => undefined`
* `ClientMessageHandler`: `(client:MuRemoteClient, data, unreliable?:boolean) => undefined`
* `ServerMessageHandler`: `(data, unreliable:boolean) => undefined`

To create a `mudb` application, a socket (i.e. a `MuSocket` instance) and a corresponding socket server (i.e. a `MuSocketServer` instance) are required.  We try to make `mudb` extensible by allowing you to use a customized socket-server implementation.

A few socket modules are provided out of the box alongside `mudb` (e.g. [muweb-socket](../muweb-socket)).  Make sure that you have checked those out before trying to create your own socket modules.

### <a name="section_2.1.1"></a> 2.1.1 `MuSocket`
`MuSocket`s are **bidirectional** sockets.  They support both reliable, ordered streams and unreliable optimistic packet transfer.  Any `mudb` sockets should implement the `MuSocket` interface as described below.

#### <a name="section_2.1.1.1"></a> 2.1.1.1 `sessionId:string`
Required property, a unique session id identifying the socket

#### <a name="section_2.1.1.2"></a> 2.1.1.2 `open:boolean`
Required property, a flag determining whether the socket is open

#### <a name="section_2.1.1.3"></a> 2.1.1.3 `start(spec)`
Required method, can be used to establish a connection to the server from the client side

* `spec:{ ready, message, close }`
    * `ready()` should be called when the connection is ready
    * `message(data:Uint8Array|string, unreliable:boolean)` should be called when receiving messages
    * `close(error?)` should be called when the connection is closed

#### <a name="section_2.1.1.4"></a> 2.1.1.4 `send(data:Uint8Array|string, unreliable?:boolean)`
Required method, used to send messages to the other end of the connection

#### <a name="section_2.1.1.5"></a> 2.1.1.5 `close()`
Required method, used to close the connection

### <a name="section_2.1.2"></a> 2.1.2 `MuSocketServer`
A `MuSocketServer` handles client communications coming through the corresponding `MuSocket`s.  Any `mudb` socket servers should implement the `MuSocketServer` interface as described below.

#### <a name="section_2.1.2.1"></a> 2.1.2.1 `clients:MuSocket[]`
Required property, server-side mocks of connected clients

#### <a name="section_2.1.2.2"></a> 2.1.2.2 `open:boolean`
Required property, a flag determining whether the socket server is running

#### <a name="section_2.1.2.3"></a> 2.1.2.3 `start(spec)`
Required method, used to launch the socket server

* `spec:{ ready, connection, close }`
    * `ready()` should be called when the socket server is launched
    * `connection(client:MuSocket)` should be called when a client connects
    * `close(error?)` should be called when the socket server is closed

#### <a name="section_2.1.2.4"></a> 2.1.2.4 `close()`
Required method, used to shut down the socket server

## <a name="section_2.2"></a> 2.2 `MuServer(socketServer:MuSocketServer)`

```javascript
var httpServer = require('http').createServer(/* ... */)
var socketServer = new require('muweb-socket').MuWebSocketServer(httpServer)
var muServer = new require('mudb').MuServer(socketServer)
```

### <a name="section_2.2.1"></a> 2.2.1 `protocol(schema:ProtocolSchema) : MuServerProtocol`
Adds a server protocol, and returns it to be configured.

A `MuServer` can have multiple protocols.  Note that you cannot add any new protocols after the server is started.

### <a name="section_2.2.2"></a> 2.2.2 `start(spec?)`
Launches server.

* `spec:{ ready?, close? }`
    * `ready()`: called when the underlying socket server is launched
    * `close(error?)`: called when the underlying socket server is closed

### <a name="section_2.2.3"></a> 2.2.3 `destroy()`
Shuts down the underlying socket server and terminates all clients.  Useful when having multiple instances of `mudb`.

## <a name="section_2.3"></a> 2.3 `MuServerProtocol`

### <a name="section_2.3.1"></a> 2.3.1 `broadcast:TableOf<DispatchFn>`
An object of methods, each of which broadcasts to all connected clients.  Each message (delta encoded) will be handled by a specific handler.  For example, the message sent by `protocol.broadcast.shower(shampoo, true)` will be handled by the `shower` method on the corresponding client protocol, as `shower(shampoo, true)`.  So this is effectively dispatching method calls to a remote object.

### `broadcastRaw:SendRawFn`
A method that broadcasts to all connected clients with "raw" (not processed, contrary to delta) messages.  The messages will be handled by the raw message handler of the corresponding client protocol.

### <a name="section_2.3.2"></a> 2.3.2 `configure(spec)`
Each protocol should be configured before the server is started and can be configured only once, by specifying the event handlers in `spec`.

* `spec:{ message, ready?, connect?, raw?, disconnect?, close? }`
    * `message:TableOf<ClientMessageHandler>` required
    * `ready()` called when the underlying socket server is launched
    * `connect(client:MuRemoteClient)` called when a client connects
    * `raw(client:MuRemoteClient, data:Uint8Array|string, unreliable:boolean)` called when a "raw" message is received
    * `disconnect(client:MuRemoteClient)` called when a client disconnects
    * `close()` called when the underlying socket server is closed

## <a name="section_2.4"></a> 2.4 `MuRemoteClient`
A `MuRemoteClient` is the server-side representation of a client, used in the event handlers.

### <a name="section_2.4.1"></a> 2.4.1 `sessionId`
A string representing a unique session id identifying the client.

### <a name="section_2.4.2"></a> 2.4.2 `message:TableOf<DispatchFn>`
An object of methods, each of which sends messages (delta encoded) to the corresponding client.

### <a name="section_2.4.3"></a> 2.4.3 `sendRaw:SendRawFn`
A method that sends "raw" messages to the corresponding client.

### <a name="section_2.4.4"></a> 2.4.4 `close()`
Closes the reliable socket.

## <a name="section_2.5"></a> 2.5 `MuClient(socket:MuSocket)`

```javascript
var socket = new require('muweb-socket/socket').MuWebSocket(spec)
var muClient = new require('mudb').MuClient(socket)
```

### <a name="section_2.5.1"></a> 2.5.1 `protocol(schema:ProtocolSchema) : MuClientProtocol`
Adds a client protocol, and returns it to be configured.

A `MuClient` can have multiple protocols.  Note that you cannot add any new protocols after the client is started.

### <a name="section_2.5.2"></a> 2.5.2 `start(spec?)`
Runs client.

* `spec:{ ready?, close? }`
    * `ready(error?:string)` called when the client is ready to handle messages
    * `close(error?:string)` called when all sockets are closed

### <a name="section_2.5.3"></a> 2.5.3 `destroy()`
Closes all sockets.

## <a name="section_2.6"></a> 2.6 `MuClientProtocol`

### <a name="section_2.6.1"></a> 2.6.1 `server:MuRemoteServer`
The client-side representation of the server.

### <a name="section_2.6.2"></a> 2.6.2 `configure(spec)`
Each protocol should be configured before the client is started and can be configured only once, by specifying the event handlers in `spec`.

* `spec:{ message, ready?, raw?, close? }`
    * `message:TableOf<ServerMessageHandler>` required
    * `ready()` called when the client is ready to handle messages
    * `raw(data:Uint8Array|string, unreliable:boolean)` called when receiving a "raw" message
    * `close()` called when all sockets are closed

## <a name="section_2.7"></a> 2.7 `MuRemoteServer`

### <a name="section_2.7.1"></a> 2.7.1 `message:TableOf<DispatchFn>`
An object of methods, each of which sends specific messages (delta encoded) to the server.

### `sendRaw:SendRawFn`
A method that sends "raw" messages to the server.

# <a name="section_3"></a> 3 usage tips

# <a name="section_4"></a> 4 helpful modules

# <a name="section_5"></a> 5 more examples

# <a name="section_6"></a> 6 TODO

* more test cases

# credits
Development supported by Shenzhen DianMao Digital Technology Co., Ltd.

<img src="https://raw.githubusercontent.com/mikolalysenko/mudb/master/img/logo.png" />

Written in Shenzhen, China.

(c) 2017 Mikola Lysenko, Shenzhen DianMao Digital Technology Co., Ltd.


