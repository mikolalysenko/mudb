# web-socket
for WebSocket communications, server implementation based on [`ws`](https://github.com/websockets/ws)

## example

**server**

```ts
import { MuWebSocketServer } from 'mudb/socket/web/server'
import { MuServer } from 'mudb/server'
import http = require('http')

const httpServer = http.createServer()
const socketServer = new MuWebSocketServer({
    server: httpServer,
})
const server = new MuServer(socketServer)
```

**client**

```ts
import { MuWebSocket } from 'mudb/socket/web/client'
import { MuClient } from 'mudb/client'

const socket = new MuWebSocket({
    sessionId: Math.random().toString(36).substring(2),
    url: 'ws://127.0.0.1:9966',
})
const client = new MuClient(socket)
```

## API
* [`MuWebSocketServer`](#muwebsocketserver)
* [`MuWebSocket`](#muwebsocket)

---

### `MuWebSocketServer`
implements [`MuSocketServer`](../README#musocketserver)

```ts
import { MuWebSocketServer } from 'mudb/socket/web/server'

new MuWebSocketServer(spec:{
    server:http.Server|https.Server,
    bufferLimit:number=1024,
    pingInterval:number=0,
    backlog?:number,
    maxPayload?:number,
    path?:string,
    handleProtocols?:(protocols:any[], request:http.IncomingMessage) => any,
    perMessageDeflate:boolean|object=false,
    scheduler?:MuScheduler,
    logger?:MuLogger;
})
```
* `server` an HTTP/S server
* `bufferLimit` the hard limit on the byte size of buffered data per connection, exceeding which will cause unreliable messages to be dropped
* `pingInterval` if >0, server will send a ping frame to an idle connection every `pingInterval` ms
* `backlog` the hard limit on the number of pending connections
* `maxPayload` the maximum byte size of each message
* `path` if specified, only connections matching `path` will be accepted
* `handleProtocols(protocols, request)` a function used to handle the WebSocket subprotocols
    * `protocols` a list of subprotocols indicated by the client in the `Sec-WebSocket-Protocol` header
    * `request` an HTTP GET request
* `perMessageDeflate` controlling the behavior of [permessage-deflate extension](https://tools.ietf.org/html/draft-ietf-hybi-permessage-compression-19#page-15), disabled by default, can be a table of extension parameters:
    * `serverNoContextTakeover:boolean` whether to include the `server_no_context_takeover` parameter in the corresponding
   negotiation response
    * `clientNoContextTakeover:boolean` whether to include the `client_no_context_takeover` parameter in the corresponding
   negotiation response
    * `serverMaxWindowBits:number` the value of `windowBits`
    * `clientMaxWindowBits:number` request a custom client window size
    * `threshold:number=1024` payloads smaller than this will not be compressed
    * `zlibDeflateOptions:object` [options](https://nodejs.org/api/zlib.html#zlib_class_options) to pass to zlib on deflate
    * `zlibInflateOptions:object` [options](https://nodejs.org/api/zlib.html#zlib_class_options) to pass to zlib on inflate
* `scheduler` can be set to a [`MuMockScheduler`](../../scheduler/README#mumockscheduler) for testing

---

### `MuWebSocket`
implements [`MuSocket`](../README#musocket)

```ts
import { MuWebSocket } from 'mudb/socket/web/client'

new MuWebSocket(spec:{
    sessionId:string,
    url:string,
    maxSockets:number=5,
    bufferLimit:number=1024,
    logger?:MuLogger,
})
```
* `sessionId` the token used to identify the client
* `url` the server URL
* `maxSockets` the number of WebSocket connections to be opened
* `bufferLimit` the hard limit on the byte size of buffered data, exceeding which will cause unreliable messages to be dropped
