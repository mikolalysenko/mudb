# uws-socket
WebSocket communications for a [`uWebSockets.js`](https://github.com/uNetworking/uWebSockets.js) backend

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
socketServer.listen(9001, (err, listenSocket) => {
    if (err) {
        console.error(err)
    }
})
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
* `server` a uWS app
* `bufferLimit` the hard limit on the byte size of buffered data per WebSocket
* `idleTimeout` an idle connection is closed after `idleTimeout` seconds, disabled by default
* `path` only requests matching this URL pattern will be caught

#### methods
```ts
listen(port:number, cb:(err:Error|null, listenSocket:object|false) => void)
```
Listens to port, callback hands an Error if failed.

### `MuUWSSocket`
an alias of [`MuWebSocket`](../web/README#muwebsocket)
