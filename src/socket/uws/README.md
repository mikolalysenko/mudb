# uws-socket
mudb socket server for [`uWebSockets.js`](https://github.com/uNetworking/uWebSockets.js)

## Example

**server**
```ts
import uWS = require('uWebSockets.js')
import { MuUWSSocketServer } from 'mudb/socket/uws/server'
import { MuServer } from 'mudb/server'

const server = uWS.App()
const socketServer = new MuUWSSocketServer({ server })
const server = new MuServer(socketServer)

server.start()
```

**client**
```ts
import { MuUWSSocket } from 'mudb/socket/uws/client'
import { MuClient } from 'mudb/client'

const socket = new MuUWSSocket({
    sessionId: Math.random().toString(36).substring(2),
    url: 'ws://127.0.0.1:9001',
})
const client = new MuClient(socket)

client.start()
```

## API
* [MuUWSSocketServer](#muuwssocketserver)
* [MuUWSSocket](#muuwssocket)

### `MuUWSSocketServer`
implements [`MuSocketServer`](../README#musocketserver)

```ts
import { MuUWSSocketServer } from 'mudb/socket/uws/server'

new MuUWSSocketServer(spec:{
    server:uWS.TemplatedApp,
    bufferLimit:number=1024,
    idleTimeout:number=0,
    path:string='/*',
    scheduler?:MuScheduler,
    logger?:MuLogger,
})
```
* `server` a `uWebSocket.js` app
* `bufferLimit` the hard limit on the byte size of buffered data per WebSocket
* `idleTimeout` an idle connection is closed after `idleTimeout` seconds, disabled by default
* `path` only the WebSocket upgrade requests matching this URL pattern will be caught

### `MuUWSSocket`
an alias of [`MuWebSocket`](../web/README#muwebsocket)
