# core
the starting point of creating a `mudb` application

Building a `mudb` application is all about implementing protocols.
* construct client/server with the socket implementation of your choice
* define messaging interfaces and group them together by protocol
* register protocols and the corresponding message and event handlers

## example

**schema.ts**
```ts
import { MuStruct, MuASCII, MuUTF8 } from 'mudb/schema'

// you can define as many protocols as you need
// each protocol should be a sensible grouping of several messaging interfaces

// minimal but useless protocol
export const DummyProtocolSchema = {
    client: { },
    server: { },
}

export const ChatProtocolSchema = {
    // useful for tracing
    name: 'chat',

    // define all message types sent to client
    // key: message type
    // value: message structure
    client: {
        // all `log` messages share the structure { id:string, text:string }
        log: new MuStruct({
            id: new MuASCII(),
            text: new MuUTF8(),
        })
    },

    // define all message types sent to server
    server: {
        direct: new MuStruct({
            id: new MuASCII(),
            text: new MuUTF8(),
        }),
        world: new MuUTF8(),
    },
}
```

**server.ts**
```ts
import http = require('http')
import { MuWebSocketServer } from 'mudb/socket/web/server'
import { MuServer } from 'mudb/server'
import { ChatProtocolSchema, DummyProtocolSchema } from './schema'

// construct server

const httpServer = http.createServer()
const socketServer = new MuWebSocketServer({
    server: httpServer,
})
const server = new MuServer(socketServer)

// register protocols

const serverChatProtocol = server.protocol(ChatProtocolSchema)
const serverDummyProtocol = server.protocol(DummyProtocolSchema)

// configure protocols

serverChatProtocol.configure({
    // define message handlers, which must coincide with `ChatProtocolSchema.server`
    message: {
        direct: (client, { id, text }) => {
            // send a `log` message to a specific client
            // refer to `ChatProtocolSchema.client.log` for the valid message structure
            serverChatProtocol.clients[id].message.log({
                id: client.sessionId,
                text: text,
            })
        },
        world: (client, text) => {
            // send a `log` message to all connected clients
            serverChatProtocol.broadcast.log({
                id: client.sessionId,
                text: text,
            })
        }
    }
})

// start server

server.start()
httpServer.listen(9966)
```

**client.ts**
```ts
import { MuWebSocket } from 'mudb/socket/web/client'
import { MuClient } from 'mudb/client'
import { ChatProtocolSchema, DummyProtocolSchema } from './schema'

// construct client

const socket = new MuWebSocket({
    sessionId: Math.random().toString(36).substring(2),
    url: 'ws://127.0.0.1:9966'
})
const client = new MuClient(socket)

// register protocols

// note that you must register the same set of protocols in the same order as the server code does
const clientChatProtocol = client.protocol(ChatProtocolSchema)
const clientDummyProtocol = client.protocol(DummyProtocolSchema)

// configure protocols

clientChatProtocol.configure({
    // define message handlers, which must coincide with `ChatProtocolSchema.client`
    message: {
        log: ({ id, text }) => {
            console.log(`${id}: ${text}`)
        }
    }
})

// start client

client.start({
    ready: () => {
        // send a `world` message to server when client is ready
        clientChatProtocol.server.message.world('hi everyone')
    }
})
```

## API
* server-side
    * [`MuServer`](#muserver)
    * [`MuServerProtocol`](#muserverprotocol)
    * [`MuRemoteClient`](#muremoteclient)
* client-side
    * [`MuClient`](#muclient)
    * [`MuClientProtocol`](#muclientprotocol)
    * [`MuRemoteServer`](#muremoteserver)

---

### `MuServer`
```ts
import { MuServer } from 'mudb/server'

new MuServer(
    socketServer:MuSocketServer,
    logger?:MuLogger,
    skipProtocolValidation:boolean=false,
)
```
* `socketServer` a [`MuSocketServer`](socket/README#musocketserver) that handles communications with clients
* `skipProtocolValidation` whether to skip validating protocol consistency

#### props
```ts
bandwidth:{
    [sessionId:string]:{
        sent:{
            [message:string]:{
                count:number,
                bytes:number,
            },
        },
        received:{
            [message:string]:{
                count:number,
                bytes:number,
            },
        },
    },
}
```
An accumulator tracking bandwidth usage by session.

#### methods
```ts
protocol(schema:{
    server:{ [message:string]:MuSchema<any> },
    client:{ [message:string]:MuSchema<any> },
    name?:string,
}) : MuServerProtocol
```
Registers a protocol.

Caveats
* You CANNOT register or configure protocols after the server is started.

```ts
start(spec?:{
    ready?:() => void,
    close?:(error?:any) => void,
}) : void
```
* `ready()` is called when the socket server is up and running
* `close()` is called when the socket server is being shut down

```ts
destroy() : void
```
Shuts down the server and invoke close handlers.

---

### `MuServerProtocol`
Created by calling `server.protocol()`, carries a bunch of server-side message dispatchers and event handlers exclusive to the protocol.

#### props
```ts
server:MuServer
```

```ts
clients:{ [sessionId:string]:MuRemoteClient }
```
A table of server-side abstractions of connected clients, indexed by session id.

```ts
broadcast:{ [message:string]:(data:any, unreliable?:boolean) => void }
```
A table of message dispatchers, calling one of which will broadcast a message to all connected clients.  For example, calling `protocol.broadcast.sync(state)` will send `state` as a `sync` message to all the clients through reliable delivery.

#### methods
```ts
configure(spec:{
    message:{ [type:string]:(client:MuRemoteClient, data:any, unreliable?:boolean) => void },
    ready?:() => void,
    connect?:(client:MuRemoteClient) => void,
    raw?:(client:MuRemoteClient, data:Uint8Array|string, unreliable:boolean) => void,
    disconnect?:(client:MuRemoteClient) => void,
    close?:() => void,
}) : void
```
Defines event handlers specific to the protocol.  The optional handlers default to noop if not specified.
* `message` a table of message handlers
* `ready()` is called when the server is ready
* `connect()` is called when a client is connected
* `raw()` handles `raw` messages from clients
* `disconnect()` is called when a client is disconnected
* `close()` is called when the serve is being shut down

Caveats:
* You SHOULD configure the protocols before the server is started.
* `configure()` can be called only once for each protocol.

```ts
broadcastRaw(data:Uint8Array|string, unreliable?:boolean) : void
```
Broadcasts `data` as a `raw` message to all the clients.  `data` will be sent as is.

---

### `MuRemoteClient`
An abstraction of a connected client.  Available as an argument to the event handlers representing the client in question.

#### props
```ts
sessionId:string
```
The session id the client is constructed with.

```ts
message:{ [type:string]:(data:any, unreliable?:boolean) => void }
```
A table of message dispatchers, calling one of which will send a message to the corresponding client.  For example, calling `client.message.sync(state, true)` will send `state` as a `sync` message to the client through unreliable delivery.

#### methods
```ts
sendRaw(data:Uint8Array|string, unreliable?:boolean) : void
```
Sends `data` as a `raw` message to the corresponding client.

```ts
close() : void
```
Closes the connection.

---

### `MuClient`
```ts
import { MuClient } from 'mudb/client'

new MuClient(
    socket:MuSocket,
    logger?:MuLogger,
    skipProtocolValidation:boolean=false,
)
```
* `socket` a [`MuSocket`](socket/README#musocket) that handles communications with the server
* `skipProtocolValidation` whether to skip validating protocol consistency

#### methods
```ts
protocol(schema:{
    server:{ [message:string]:MuSchema<any> },
    client:{ [message:string]:MuSchema<any> },
    name?:string,
}) : MuClientProtocol
```
Registers a protocol.

Caveats:
* You CANNOT register protocols after the client is started.
* You MUST register the same set of protocols in the exact same order as the server code does, otherwise the protocol validation will fail and the connection will be killed.

```ts
start(spec?:{
    ready?:(error?:string) => void,
    close?:(error?:string) => void,
}) : void
```
Starts the client and connects to the server.
* `ready()` is called when the connection is ready
* `close()` is called when the socket is being closed

```ts
destroy() : void
```
Closes the connection to server.

---

### `MuClientProtocol`
Created by calling `client.protocol()`, carries a bunch of client-side message dispatchers and event handlers exclusive to the protocol.

#### props
```ts
client:MuClient
```

```ts
server:MuRemoteServer
```

#### methods
```ts
configure(spec:{
    message:{ [type:string]:(data:any, unreliable:boolean) => void },
    ready: () => void,
    raw?:(data:Uint8Array|string, unreliable:boolean) => void,
    close: () => void,
}) : void
```
Defines event handlers specific to the protocol.  The optional handlers default to noop if not specified.
* `message` a table of message handlers
* `ready()` is called when the connection is established
* `raw()` handles `raw` messages from the server
* `close()` is called when the connection is being closed

Caveats:
* You SHOULD configure the protocols before the client is started.
* `configure()` can be called only once for each protocol.

---

### `MuRemoteServer`
Client-side abstraction of the server.

#### props
```ts
message:{ [type:string]:(data:any, unreliable?:boolean) => void }
```
A table of message dispatchers, calling one of which will send a message to the server.  For example, calling `server.message.sync(state, true)` will send `state` as a `sync` message to the server through unreliable delivery.

#### methods
```ts
sendRaw(data:Uint8Array|string, unreliable?:boolean) : void
```
Sends `data` as a `raw` message to the server.
