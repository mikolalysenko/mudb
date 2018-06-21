# muworker-socket
[Web Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API#Web_Workers_concepts_and_usage) made available to `mudb`.  Suitable for creating games with single-player mode by running the server in a separate thread to allow potentially better user experience.

# example

```javascript
var mudb = require('mudb')
var muWorkerSocket = require('muworker-socket')

var server = muWorkerSocket.createWorkerServer()
var socket = muWorkerSocket.createWorkerSocket({
    sessionId: /* session id */,
    server,
})
var muClient = new mudb.MuClient(socket)
muClient.start(/* handlers */)
```

# table of contents

# install #

```
npm i muworker-socket
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

## `createWorkerSocketServer()` ##


## `createWorkerSocket(spec)` ##


## `MuWorkerSocketServer` ##


### `state:SocketServerState` ###


### `clients:MuWorkerSocket[]` ###


### `start(spec)` ###


### `close()` ###


## `MuWorkerSocket` ##


### `state:SocketState` ###


### `sessionId:SessionId` ###


### `open(spec)` ###


### `send(data, unreliable?)` ###


### `close()` ###


# credits
© 2018 Shenzhen Dianmao Technology Company Limited
