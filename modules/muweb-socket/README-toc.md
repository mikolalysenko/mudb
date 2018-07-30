# muweb-socket
WebSocket communications made available for `mudb`, using [`uws`](https://github.com/uNetworking/uWebSockets) for the WebSocket server implementation.

# example

**server.js**

```javascript
var http = require('http')
var MuWebSocketServer = require('muweb-socket/server').MuWebSocketServer
var MuServer = require('mudb/server').MuServer

var httpServer = http.createServer()
// use a pre-created HTTP server
var socketServer = new MuWebSocketServer({
    server: httpServer
})
var muServer = new MuServer(socketServer)

muServer.start({ /* event handlers */ })

// should call `listen()` when using an external HTTP/S server
httpServer.listen()
```

**client.js**

```javascript
var MuWebSocket = require('muweb-socket/socket').MuWebSocket
var MuClient = require('mudb/client').MuClient

var socket = new MuWebSocket({
    sessionId: Math.random().toString(36).substr(2),
    url: /* URL to server */,
    maxSockets: 10, // how many WebSockets to be opened
})
var muClient = new MuClient(socket)

muClient.start({ /* event handlers */ })
```

# table of contents

# install #

```
npm i muweb-socket
```

# api #

## interfaces ##

Purely instructive types used to describe the API:
* `SessionId`: `string`
* `Data`: `Uint8Array | string`
* `SocketState`: an enum consisting of three members
    * `SocketState.INIT`
    * `SocketState.OPEN`
    * `SocketState.CLOSED`
* `SocketServerState`: an enum consisting of three members
    * `SocketServerState.INIT`
    * `SocketServerState.RUNNING`
    * `SocketServerState.SHUTDOWN`

## `MuWebSocketServer(spec)` ##
A `MuWebSocketServer` can be used to create a `MuServer`.  It handles client-server communications over the WebSocket protocol.

* `spec:object`
    * `server:http.Server | https.Server` an HTTP/S server

### `state:SocketServerState` ###
A tri-valued field **determining** the availability of the socket server.  It is initialized to `SocketServerState.INIT`.

### `clients:MuWebSocketClient[]` ###
Virtual server-side sockets each of which is used to communicate with a specific client.

### `start(spec)` ###
Spins up a WebSocket server and hooks handlers.  `state` is set to `SocketServerState.RUNNING`.

* `spec:object`
    * `ready()` called when the WebSocket server is ready to handle connections
    * `connection(socket:MuWebSocketClient)` called when a client first connects
    * `close(error?)` called when the WebSocket server is shut down

### `close()` ###
Shuts down the WebSocket server.  `state` is set to `SocketServerState.SHUTDOWN`.

## `MuWebSocket(spec)` ##
A `MuWebSocket` can be used to create a `MuClient`.  It is a virtual client-side socket used to communicate with the server over the WebSocket protocol.

* `spec:object`
    * `sessionId:SessionId`: a unique session id used to identify a client
    * `url:string`: URL to the server
    * `maxSockets?:number`: optional, the number of connections to be opened, which defaults to 5

Two data channels can exist simultaneously in each `MuWebSocket`, one delivers in order and the other delivers out of order but with potentially lower latency.  The first established connection is used as the in-order data channel.

### `sessionId:SessionId` ###
The unique session id identifying the client.

### `state:SocketState` ###
A tri-valued field determining the availability of the socket.  It is initialized to `SocketState.INIT`.

### `open(spec)` ###
Opens a number of connections to the server. `state` is set to `SocketState.OPEN` when the in-order data channel is determined.

* `spec:object`
    * `ready()` called when the in-order channel is ready
    * `message(data:Data, unreliable:boolean)` called when receiving data
    * `close(error?)` called when the in-order channel is closed

### `send(data:Data, unreliable?:boolean)` ###
Sends data to the server, either via the in-order channel or the out-of-order channel.

* `data:Data` data to be sent, can either be a JSON string or a `Uint8Array`
* `unreliable?:boolean` optional, data is sent via the out-of-order channel if set to `true` to allow potential performance improvements

### `close()` ###
Closes all connections.  `state` is set to `SocketState.CLOSED`.

# credits
Development supported by Shenzhen DianMao Digital Technology Co., Ltd.

<img src="https://raw.githubusercontent.com/mikolalysenko/mudb/master/img/logo.png" />

Written in Shenzhen, China.

(c) 2017 Mikola Lysenko, Shenzhen DianMao Digital Technology Co., Ltd.
