# rpc
schema-based RPC that supports authentication and more

## concepts

Terms in *italics* should be understood in the context of this module.

**protocol**

A *protocol* is the description of the api between a *client* and a *server*.  You can define multiple different *protocols* in your application for different functionalities, with equal number of *client-server* pairs each dedicated to one of the *protocols*.

**client/server**

All communications are initiated by *client*.  *Client* calls, *server* executes.  *Client* can only communicate with *server* through the api defined by the *protocol*, which means they both need to "understand" the same *protocol*.

**transport**

*Client* and *server* take care of invocation and execution, while *transport* takes care of message passing.

*Transports* are *protocol*-agnostic.  It means different *servers* can share the same *server transport*.  Similarly, different *clients* can share one *client transport*.

## example

```ts
import { MuStruct, MuASCII, MuDate, MuOption, MuVoid, MuArray } from 'mudb/schema'
import { MuRPCHttpServerTransport } from 'mudb/rpc/http/server'
import { MuRPCServer } from 'mudb/rpc/server'
import { MuRPCHttpClientTransport } from 'mudb/rpc/http/client'
import { MuRPCClient } from 'mudb/rpc/client'
import http = require('http')

 const Info = new MuStruct({
    ip: new MuASCII(),
    datetime: new MuDate(),
    serverName: new MuOption(new MuASCII()),
})

// define api

const protocol = {
    // what is the api for
    name: 'analytics',

    // argument and return data types are defined by MuSchemas
    api: {
        // describe an endpoint that uploads traffic info
        // add(info:{ uid:number, ip:string, datetime:Date, serverName?:string })
        add: {
            arg: Info,
            // use void schema for return of POST-like endpoints
            ret: new MuVoid(),
        },

        // describe an endpoint that retrieves cumulated info of specified date
        // getByDate(date:Date) : info[]
        getByDate: {
            arg: new MuDate(),
            ret: new MuArray(Info, Infinity),
        },

        login: {
            arg: new MuASCII(),
            ret: new MuVoid(),
        },
    },
}

// server

const ROUTE = 'rpc'
const serverTransport = new MuRPCHttpServerTransport({
    route: ROUTE,
    byteLimit: 2 ** 20, // limit of request data size
    cookie: 'auth',     // cookie name
})

const store:any[] = []
const server = new MuRPCServer({
    protocol,
    transport: serverTransport,

    // checked on every request
    // an error response will be sent if this returns false
    authorize: async (conn) => true,

    // the remote procedures to be called
    handlers: {
        add: async (conn, info) => {
            store.push(info)
        },
        getByDate: async (conn, date) => {
            if (conn.auth === 'admin') {
                date.setHours(0, 0, 0, 0)
                const start = date.getTime()
                date.setHours(23, 59, 59, 999)
                const end = date.getTime()
                return store.filter((item) => {
                    const timestamp = item.datetime.getTime()
                    return timestamp >= start && timestamp <= end
                })
            }
            return []
        },
        login: async (conn, handle) => {
            conn.setAuth(handle)
        },
    }
})

const httpServer = http.createServer(async (req, res) => {
    // route requests
    await serverTransport.handler(req, res)
})
httpServer.listen(9966)

// client

const clientTransport = new MuRPCHttpClientTransport({
    url: `http://127.0.0.1:9966/${ROUTE}`,
    timeout: Infinity,
})
const client = new MuRPCClient(protocol, clientTransport)

await client.api.add({ ip: '72.92.73.181', datetime: new Date('2020-01-16T15:06:28'), serverName: undefined })
await client.api.add({ ip: '20.200.121.186', datetime: new Date('2020-03-21T22:39:35'), serverName: 'us1' })
await client.api.add({ ip: '109.79.143.230', datetime: new Date('2020-06-13T03:52:14'), serverName: 'jp1' })
await client.api.add({ ip: '200.28.109.236', datetime: new Date('2020-06-13T20:55:58'), serverName: undefined })

await client.api.login('user')
console.log(await client.api.getByDate(new Date('2020-06-13')))
await client.api.login('admin')
console.log(await client.api.getByDate(new Date('2020-06-13')))
```

## API
* *protocol*
    * [`MuRPCProtocol`](#murpcprotocol)
* *transport*
    * HTTP
        * [`MuRPCHttpConnection`](#murpchttpconnection)
        * [`MuRPCHttpServerTransport`](#murpchttpservertransport)
        * [`MuRPCHttpClientTransport`](#murpchttpclienttransport)
* *rpc*
    * [`MuRPCServer`](#murpcserver)
    * [`MuRPCClient`](#murpcclient)

---

### `MuRPCProtocol`
A *protocol* defines the api by argument and return data type of each endpoint, using `MuSchema`s.  Note that each *protocol* MUST be given a different name.
```ts
type MuRPCProtocol = {
    name:string,
    api:{
        [method:string]:{
            arg:MuSchema<any>,
            ret:MuSchema<any>,
        },
    },
}
```

---

### `MuRPCHttpConnection`
```ts
class MuRPCHttpConnection implements MuRPCConnection
```

Each call creates a `MuRPCConnection` instance, which is made available in every handler and the auth function.  It carries useful info for handling the request.

#### props
```ts
request:http.IncomingMessage
```
the first parameter to the Node 'request' event listener

```ts
response:http.ServerResponse
```
the second parameter to the Node 'request' event listener

```ts
useCookie:boolean
```
is cookie authentication enabled

```ts
cookie:string
```
auth cookie name

```ts
auth:string
```
auth token

#### methods
```ts
setAuth(auth:string, options?:Partial<{
    domain:string,
    path:string,
    maxAge:number,
    sameSite:''|'none'|'lax'|'strict',
    httpOnly:boolean,
    secure:boolean,
}>) : void
```
Sets auth token in client cookies, with optional cookie attributes.  `setAuth('')` will end the current session.

---

### `MuRPCHttpServerTransport`
```ts
class MuRPCHttpServerTransport implements MuRPCServerTransport

new MuRPCHttpServerTransport(spec:{ route:string, byteLimit:number, cookie?:string })
```
* `byteLimit` maximum byte size of request data
* `cookie` the cookie name for auth token, cookie authentication is enabled if this is specified

#### methods
```ts
handler(req:http.IncomingMessage, res:http.ServerResponse) : Promise<boolean>
```
Routes requests.  MUST be called in a 'request' event listener.

---

### `MuRPCHttpClientTransport`
```ts
class MuRPCHttpClientTransport implements MuRPCClientTransport

new MuRPCHttpClientTransport(spec:{ url:string, timeout:number })
```
* `timeout` how long it takes to automatically terminate a request, in ms

---

### `MuRPCServer`
Authorizes and executes calls from the corresponding *client*.

```ts
class MuRPCServer<P extends MuRPCProtocol>

new MuRPCServer(spec:{
    protocol:P,
    transport:MuRPCServerTransport,
    authorize:(conn:MuRPCConnection) => Promise<boolean>,
    handlers:{
        [method in keyof P['api']]:(
            conn:MuRPCConnection,
            arg:P['api'][method]['arg']['identity'],
            ret:P['api'][method]['ret']['identity'],
        ) => Promise<P['api'][method]['ret']['identity']>
    },
    logger?:MuLogger,
})
```

---

### `MuRPCClient`
Initiates invocations to procedures of the corresponding *server*.

```ts
class MuRPCClient<P extends MuRPCProtocol>

new MuRPCClient(protocol:P, transport:MuRPCClientTransport, logger?:MuLogger)
```

#### props
```ts
api:{
    [method in keyof P['api']]:(
        arg:P['api'][method]['arg']['identity'],
    ) => Promise<P['api'][method]['ret']['identity']>,
}
```
A table of stubs to be called to initiate invocations to remote procedures.

## interfaces
* [MuRPCConnection](#murpcconnection)
* [MuRPCServerTransport](#murpcservertransport)
* [MuRPCClientTransport](#murpcclienttransport)

---

### `MuRPCConnection`

```ts
interface MuRPCConnection
```
A `MuRPCConnection` can be used to cumulate info for handling requests and set auth token, consumed by handlers and the auth function.

```ts
auth:string
```
the auth token received

```ts
setAuth(auth:string) : void
```
sets an auth token for client

---

### `MuRPCServerTransport`

```ts
interface MuRPCServerTransport<P extends MuProtocol>
```
A `MuRPCServerTransport` is responsible sending messages to clients, consumed by `MuRPCServer`.

```ts
listen(
    schemas:MuRPCSchemas<P>,
    authorize:(conn:MuRPCConnection) => Promise<boolean>,
    recv:(
        conn:MuRPCConnection,
        arg:MuRPCSchemas<P>['argSchema']['identity'],
        resp:MuRPCSchemas<P>['responseSchema']['identity'],
    ) => Promise<void>,
) : void
```

---

### `MuRPCClientTransport`

```ts
interface MuRPCClientTransport<P extends MuProtocol>
```
A `MuRPCClientTransport` is responsible for sending messages to the server, consumed by `MuRPCClient`.

```ts
send(
    schemas:MuRPCSchemas<P>,
    arg:MuRPCSchemas<P>['argSchema']['identity'],
) : Promise<MuRPCSchemas<P>['responseSchema']['identity']>
```

## ideas
* streaming transport
    * status
    * keep alive
    * auto reconnect
