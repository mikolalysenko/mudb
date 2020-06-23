# socket
a collection of socket-server modules each supporting a commonly used communication protocol, and both reliable and unreliable delivery

Each `socket` module exports a class implementing the `MuSocket` interface (usually an adapter) and a class implementing the `MuSocketServer` interfaces.  And they can be used out of the box with `MuClient` and `MuServer` respectively.

## `MuSocket`
The interface of both client-side and server-side sockets.

### props
```ts
sessionId:string
```
User-generated session id.

```ts
state:MuSocketState

enum MuSocketState { INIT, OPEN, CLOSED }
```
Initial state should be `INIT`.

A `MuSocket` should maintain simple state machine with the following transitions.

|         | INIT   | OPEN   | CLOSED |
|---------|--------|--------|--------|
| open()  | OPEN   | ERROR  | ERROR  |
| close() | CLOSED | CLOSED | CLOSED |

### methods
```ts
open(spec:{
    ready:() => void,
    message:(data:Uint8Array|string, ) => void,
    close:(error?:any) => void,
}) : void
```
Connects to the socket server and establishes at least one reliable and one unreliable delivery channel, and hooks the handlers.
* `ready()` is called when it's ready to receive data
* `message()` is called when data is received
* `close()` is called when the socket is being closed

```ts
send(data:Uint8Array|string, unreliable?:boolean) : void
```
Sends data to the socket server.  `unreliable` is used to determine whether to use reliable or unreliable delivery.

```ts
close() : void
```
Closes the connection.

## `MuSocketServer`

### props
```ts
state:MuSocketServerState

enum MuSocketServerState {
    INIT,
    RUNNING,
    SHUTDOWN,
}
```
Initial state should be `INIT`.

A `MuSocketServer` should maintain a simple state machine with the following transitions.

|         | INIT     | RUNNING  | SHUTDOWN |
| ------- | -------- | -------- | -------- |
| start() | RUNNING  | ERROR    | ERROR    |
| close() | SHUTDOWN | SHUTDOWN | SHUTDOWN |

```ts
clients:MuSocket[]
```
A list of open connections.  When a connection is closed, it should be removed from the list.

### methods
```ts
start(spec:{
    ready:() => void,
    connection:(socket:MuSocket) => void,
    close:(error?:any) => void,
})
```
Spins up a server and hooks the handlers.
* `ready()` is called when the socket server is ready to handle connections
* `connection()` is called when a connection is established
* `close()` is called when the server is being shut down

```ts
close() : void
```
Closes all connections and shuts down the socket server.
