# mulocal-socket
Network socket emulation for `mudb`.

In `mulocal-socket`, no real network connections are established so no Web servers are needed, meaning any `mudb` applications using `mulocal-socket` can run entirely in a browser.  This can be favorable to development in that

* you can forget about restarting the server on changes
* you can debug using the dev tools provided by browsers

# example

```javascript
var mudb = require('mudb')
var muLocalSocket = require('mulocal-socket')

var socketServer = muLocalSocket.createLocalSocketServer()
var muServer = new mudb.MuServer(socketServer)

muServer.start({ /* event handlers */ })

var socket = muLocalSocket.createLocalSocket()
var muClient = new mudb.MuClient(socket)

mClient.start({ /* event handlers */ })
```

# table of contents

# install #

```
npm i mulocal-socket
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

## `createLocalSocketServer()` ##
A factory returning a new instance of `MuLocalSocketServer`.

## `createLocalSocket(spec)` ##
Spawns and associates two new instances of `MuLocalSocket`, then returns the client-side socket to be used to create a `MuClient`.

* `spec:object`
    * `sessionId:SessionId`: a unique session id used to identify a client
    * `server:MuLocalSocketServer`: the socket server

Mostly you should only use the factory methods instead of the constructors.

## `MuLocalSocketServer` ##
A `MuLocalSocketServer` is a pseudo socket server that can be used to create a `MuServer`.  It does not create any server-side sockets and is only responsible for accumulating and closing sockets.

### `state:SocketServerState` ###
A tri-valued field determining the availability of the socket server.  It is initialized to `SocketServerState.INIT`.

### `clients:MuLocalSocket[]` ###
Server-side sockets, one per client through which the server communicates with the client.

### `start(spec)` ###
Hooks handlers and accumulates sockets.  `state` is set to `SocketServerState.RUNNING`.

* `spec:object`
    * `ready()` called when the socket server is ready
    * `connection(socket:MuLocalSocket)` called when a new server-side socket is added
    * `close(error?)` called when the socket server is shut down

### `close()` ###
Closes all sockets.  `state` is set to `SocketServerState.SHUTDOWN`.

## `MuLocalSocket(sessionId, server)` ##
A `MuLocalSocket` can either be a client-side or server-side socket and every two `MuLocalSocket`s should be associated to form an exclusive pair.  A `MuLocalSocket` can be used to create a `MuClient` when it is used as a client-side socket.

* `sessionId:SessionId`: a unique session id used to identify a client
* `server:MuLocalSocketServer`: the socket server

### `sessionId:SessionId` ###
The unique session id identifying the client.

### `state:SocketState` ###
A tri-valued field determining the availability of the socket.  It is initialized to `SocketState.INIT`.

### `open(spec)` ###
Hooks handlers and drains pending messages.  `state` is set to `SocketState.OPEN`.

* `spec:object`
    * `ready()` called when the socket is ready to receive data
    * `message(data:Data, unreliable:boolean)` called when receiving data
    * `close(error?)` called when the socket is closed

### `send(data, unreliable?)` ###
Sends data to the associated socket, which will be delivered either in order or out of order, depending on the value of `unreliable`.

* `data:Data` data to be sent, can either be a JSON string or a `Uint8Array`
* `unreliable?:boolean` optional, the data will be delivered out of order if set to `true`

### `close()` ###
Closes the socket and the socket on the other end.  `state` is set to `SocketState.CLOSED`.

# credits
Development supported by Shenzhen DianMao Digital Technology Co., Ltd.

<img src="https://raw.githubusercontent.com/mikolalysenko/mudb/master/img/logo.png" />

Written in Shenzhen, China.

(c) 2017 Mikola Lysenko, Shenzhen DianMao Digital Technology Co., Ltd.
