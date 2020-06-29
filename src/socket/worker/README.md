# muworker-socket
[Web Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API#Web_Workers_concepts_and_usage) made available to `mudb`.  Suitable for creating games with a single-player mode by running the server in a separate thread to allow better user experience.

# example
Both `browserify` and `webworkify` are required to run the example.

**worker.js**
```js
const { createWorkerSocketServer } = require('muworker-socket/server')
const { MuServer } = require('mudb/server')

// source of worker should go into `module.exports`
module.exports = () => {
    const socketServer = createWorkerSocketServer()
    const muServer = new MuServer(socketServer)

    socketServer.listen()
    muServer.start(/* listeners */)
}
```

**client.js**
```js
// `webworkify` enables workers to `require()`
const work = require('webworkify')
const { createWorkerSocket } = require('muworker-socket/socket')
const { MuClient } = require('mudb/client')

const serverWorker = work(require('./worker.js'))
const socket = createWorkerSocket({
    sessionId: Math.random().toString(36).substr(2),
    serverWorker: serverWorker,
})
const muClient = new MuClient(socket)

muClient.start(/* listeners */)
```

# table of contents

   * [2 api](#section_2)
      * [2.1 interfaces](#section_2.1)
      * [2.2 `createWorkerSocketServer()`](#section_2.2)
      * [2.3 `createWorkerSocket(spec)`](#section_2.3)
      * [2.4 `MuWorkerSocketServer`](#section_2.4)
         * [2.4.1 `listen()`](#section_2.4.1)
      * [2.5 `MuWorkerSocket`](#section_2.5)

# <a name="section_2"></a> 2 api

## <a name="section_2.1"></a> 2.1 interfaces

Purely instructive types used to describe the API:
* `SessionId`: `string`

## <a name="section_2.2"></a> 2.2 `createWorkerSocketServer()`
A factory returning a new instance of `MuWorkerSocketServer`.

## <a name="section_2.3"></a> 2.3 `createWorkerSocket(spec)`
A factory returning a new instance of `MuWorkerSocket`.

* `spec:object`
    * `sessionId:SessionId`: a unique session id used to identify a client
    * `serverWorker:Worker`: the worker in which the server is running

## <a name="section_2.4"></a> 2.4 `MuWorkerSocketServer`
A `MuWorkerSocketServer` is a pseudo socket server that can be used to instantiate a `MuServer`.

### <a name="section_2.4.1"></a> 2.4.1 `listen()`
Starts the socket server listening for connections.

## <a name="section_2.5"></a> 2.5 `MuWorkerSocket`
A `MuLocalSocket` is a pseudo client-side socket that can be used to instantiate a `MuClient`.
