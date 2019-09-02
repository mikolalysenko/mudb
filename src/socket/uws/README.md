# uWS Socket
For [`uWebSocket.js`](https://github.com/uNetworking/uWebSockets.js) backend.

## Example

**server**
```ts
import uWS = require('uWebSockets.js')
import { MuUWSSocketServer } from 'mudb/socket/uws/server';
import { MuServer } from 'mudb/server';

const httpsServer = uWS.SSLApp({
    key_file_name: 'key.pem',
    cert_file_name: 'cert.pem',
});
const socketServer = new MuUWSSocketServer({
    server: httpsServer,
});
const server = new MuServer(socketServer);

server.start();
socketServer.listen({
    port: 9966,
});
```

**client**
```ts
import { MuUWSSocket } from 'mudb/socket/uws/client';
import { MuClient } from 'mudb/client';

const socket = new MuUWSSocket({
    sessionId: Math.random().toString(36).substring(2),
    url: 'wss://127.0.0.1:9966',
});
const client = new MuClient(socket);

client.start();
```

## new MuUWSSocketServer(spec)
* `spec` {object}
    * `server` {uWS.TemplatedApp}
    * `scheduler?` {MuScheduler}

## socketServer.listen(spec)
* `spec` {object}
    * `port` {number}
    * `host?:`{string}
    * `listening?` {(listenSocket) => void} `listening` event handler

## new MuUWSSocket(spec)
* `spec` {object}
    * `sessionId` {string} the client's unique identifier
    * `url` {string} a [WebSocket URL](https://tools.ietf.org/html/rfc6455#page-14)
    * `maxSockets?` {number} the maximum amount of concurrent WebSockets the client can have, defaults to 5
