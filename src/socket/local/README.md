# local-socket
network socket emulation for development purpose

In `local-socket`, no real network connections are established so no Web servers are needed, meaning applications using `local-socket` can run entirely in a browser.  It can make your life easier:
* you can forget about restarting the server on changes
* you can debug using the dev tools provided by browsers

## example

```ts
import { MuServer, MuClient } from 'mudb'
import { createLocalSocketServer, createLocalSocket } from 'mudb/socket/local'

const socketServer = createLocalSocketServer()
const server = new MuServer(socketServer)

const socket = createLocalSocket({
    sessionId: Math.random().toString(16).substring(2),
    server: socketServer,
})
const client = new MuClient(socket)
```

## API

* [`createLocalSocketServer()`](#createlocalsocketserver())
* [`createLocalSocket()`](#createlocalsocket())
* [`MuLocalSocketServer`](#mulocalsocketserver)
* [`MuLocalSocket`](#mulocalsocket)

Use the factory functions instead of the constructors.

---

### `createLocalSocketServer()`
Creates a pseudo socket server.

```ts
createLocalSocketServer(spec?:{
    scheduler?:MuScheduler,
}) : MuLocalSocketServer
```
* `scheduler` can be set to a [`MuMockScheduler`](../../scheduler/README#mumockscheduler) for testing

---

### `createLocalSocket()`
Creates a "connection" to the socket server passed in, and returns the socket.

```ts
createLocalSocket(spec:{
    sessionId:string,
    server:MuLocalSocketServer,
    scheduler?:MuScheduler,
}) : MuLocalSocket
```
* `sessionId` a user-generated session id
* `server` the server returned by `createLocalSocketServer()`
* `scheduler` can be set to a [`MuMockScheduler`](../../scheduler/README#mumockscheduler) for testing

---

### `MuLocalSocketServer`
implements [`MuSocketServer`](../README#musocketserver)

A pseudo socket server.

---

### `MuLocalSocket`
implements [`MuSocket`](../README#musocket)

A pseudo socket.
