# murpc
Asynchronous [RPC](https://en.wikipedia.org/wiki/Remote_procedure_call) protocols for mudb

# example
See [src/example](src/example) for a contrived demo which will be explained below.  To run the demo

0. `npm i mudo`
1. cd into `src/example`
2. `tsc ./*.ts`
3. `mudo --socket websocket`

A `mudb` instance can have multiple RPC protocols for different sets of behaviors.  Naturally each RPC protocol consistes of two sides, one for server and one for client, plus a schema to describe the RPC interfaces (the argument and return).

   * [1 RPC protocol schema](#section_1)
   * [2 server-side protocol](#section_2)
   * [3 client-side protocol](#section_3)
* [ install](#section_)
* [ api](#section_)
   * [1 types](#section_1)
   * [2 MuRPC(argumentSchema, returnSchema)](#section_2)
   * [3 MuRPCServer(server, schema)](#section_3)
      * [3.1 clients:MuRemoteRPCClient[]](#section_3.1)
      * [3.2 server:MuServer](#section_3.2)
      * [3.3 schema:RPCProtocolSchema](#section_3.3)
      * [3.4 configure(spec)](#section_3.4)
   * [4 MuRemoteRPCClient](#section_4)
      * [4.1 sessionId:string](#section_4.1)
      * [4.2 rpc:TableOf<RPCCaller>](#section_4.2)
   * [5 MuRPCClient(client, schema)](#section_5)
      * [5.1 sessionId:string](#section_5.1)
      * [5.2 server:MuRemoteRPCServer](#section_5.2)
      * [5.3 client:MuClient](#section_5.3)
      * [5.4 schema:RPCProtocolSchema](#section_5.4)
      * [5.5 configure(spec)](#section_5.5)
   * [6 MuRemoteRPCServer](#section_6)
      * [6.1 rpc:TableOf<RPCCaller>](#section_6.1)

## <a name="section_1"></a> 1 RPC protocol schema
So the first step to define an RPC protocol is to specify a protocol schema using `muschema`.

Like the protocol to be created, the schema always consists of two sides, the server side and the client side.  Each side in turn contains schemas for the RPC interfaces that they implement repectively, under the name of the corresponding function.  RPC schemas are created using the `MuRPC` function, which takes the schemas of the argument and return.

```typescript
const IntegerSetSchema = new MuArray(new MuInt8());
const TotalSchema = new MuInt32();

const SecretSchema = new MuString();
const DigestSchema = new MuFixedASCII(128);

export const RPCSchema = {
    client: {
        // schema for a function that sums up all integers in a set
        // which takes an array of int8 and returns an int32
        sum: MuRPC(IntegerSetSchema, TotalSchema),
    },
    server: {
        // schema for a function that hashes a secret string
        // which takes a string and always returns an ASCII of length 128
        hash: MuRPC(SecretSchema, DigestSchema),
    },
};
```

## <a name="section_2"></a> 2 server-side protocol
You can define the server side of the RPC protocol by creating and then configuring an instance of `MuRPCServer`.

```typescript
export = function (server:MuServer) {
    const protocol = new MuRPCServer(server, RPCSchema);

    // content of the server side of the protocol
    protocol.configure({
        rpc: {
            // a hash function to be called by clients
            hash: (secret, next) => {
                // hash `secret`
                const digest = createHash('sha512').update(secret).digest('hex');
                // pass the digest back to client
                next(undefined, digest);
            },
        },

        // set up server to do something when a client connects
        connect: (client) => {
            const set = [1, 2, 3, 4];
            // call `sum()` on the client to get the total of all numbers in `set`
            client.rpc.sum(set, (total) => {
                console.log(`sum of ${set}: ${total}`);
            });
        },
    });

    server.start();
};
```

## <a name="section_3"></a> 3 client-side protocol
The last missing piece is the client side of the RPC protocol.  Similarly, you can define it through an instance of `MuRPCClient`.

```typescript
export = function (client:MuClient) {
    const protocol = new MuRPCClient(client, RPCSchema);

    // content of the client side of the protocol
    protocol.configure({
        rpc: {
            // a function to be calle by server
            sum: (set, next) => {
                // calculate the total of all numbers in `set`
                const total = set.reduce((acc, num) => acc + num);
                // pass result back to server
                next(undefined, total);
            },
        },

        // set up client to do something when it is ready to handle messages
        ready: () => {
            // generate a secret string
            const secret = Math.random().toString(36).substr(2, 11);
            // call `hash()` on server to get the digest of `secret`
            protocol.server.rpc.hash(secret, (digest) => {
                console.log('secret digest:', digest);
            });
        },
    });

    client.start();
};
```

# table of contents

# <a name="section_"></a>  install

```
npm i murpc
```

# <a name="section_"></a>  api

## <a name="section_1"></a> 1 types

Purely instructive types used to describle the API:
* `TableOf<T>`: `{ [name:string]:T } | {}`
* `RPCSchema`: `[ AnyMuSchema, AnyMuSchema ]`
* `RPCProtocolSchema`: `{ server:TableOf<RPCSchema>, client:TableOf<RPCSchema> }`
* `NextFn`: `(errorMessage:string|undefined, returnValue?) => undefined`
* `ServerRPCHandler`: `(rpcArgument, next:NextFn, client?:MuRemoteRPCClient) => undefined`
* `ClientRPCHandler`: `(rpcArgument, next:NextFn) => undefined`
* `CallbackFn`: `(returnValue) => undefined`
* `RPCCaller`: `(rpcArgument, callback:CallbackFn) => undefined`

## <a name="section_2"></a> 2 MuRPC(argumentSchema, returnSchema)
Exported from `murpc/rpc`, used when creating the RPC protocol schema, to define RPC interfaces in terms of the argument and the return:
* `argumentSchema:AnyMuSchema` the data type of the argument
* `returnSchema:AnyMuSchema` the data type of the return value

## <a name="section_3"></a> 3 MuRPCServer(server, schema)
Used to define the server side of an RPC protocol.  Exported from `murpc/server`, it takes these arguments:
* `server:MuServer`
* `schema:RPCProtocolSchema` the RPC protocol schema

### <a name="section_3.1"></a> 3.1 clients:MuRemoteRPCClient[]
Mocks of all connected clients, used to initiate RPCs to a specific client

### <a name="section_3.2"></a> 3.2 server:MuServer
The underlying `MuServer` object

### <a name="section_3.3"></a> 3.3 schema:RPCProtocolSchema
The RPC protocol schema

### <a name="section_3.4"></a> 3.4 configure(spec)
Registers event handlers specifed in `spec`

`spec:{ rpc, ready?, connect?, disconnect?, close? }`
* `rpc:TableOf<ServerRPCHandler>` an object containing the implementations of the functions to be called by clients
* `ready()` called when the server is launched
* `connect(client:MuRemoteRPCClient)` called when a client connects
* `disconnect(client:MuRemoteRPCClient)` called when a client disconnects
* `close()` called when the server is shut down

## <a name="section_4"></a> 4 MuRemoteRPCClient
A `MuRemoteRPCClient` is the server-side mock of a connected client

### <a name="section_4.1"></a> 4.1 sessionId:string
A unique session id identifying the client

### <a name="section_4.2"></a> 4.2 rpc:TableOf<RPCCaller>
A table of RPC initiators each under the name of the corresponding remote function on a client

## <a name="section_5"></a> 5 MuRPCClient(client, schema)
Used to define the client side of an RPC protocol.  Exported from `murpc/client`, it takes these arguments:
* `client:MuClient`
* `schema:ProtocolSche4ma` the RPC protocol schema

### <a name="section_5.1"></a> 5.1 sessionId:string
A unique session id identifying the client

### <a name="section_5.2"></a> 5.2 server:MuRemoteRPCServer
A mock used to initiate RPCs to the remote server

### <a name="section_5.3"></a> 5.3 client:MuClient
The underlying `MuClient` object

### <a name="section_5.4"></a> 5.4 schema:RPCProtocolSchema
The RPC protocol schema

### <a name="section_5.5"></a> 5.5 configure(spec)
Registers event handlers specified in `spec`

`spec:{ rpc, ready?, close? }`
- `rpc:TableOf<ClientRPCHandler>` an object containing the implementations of the functions to be called by the server
- `ready()` called when client is ready to handle messages
- `close()` called when the client is disconnected

## <a name="section_6"></a> 6 MuRemoteRPCServer
A `MuRemoteRPCServer` is the client-side mock of the server

### <a name="section_6.1"></a> 6.1 rpc:TableOf<RPCCaller>
A table of RPC initiators each under the name of the corresponding remote function on the server

# credits
Development supported by Shenzhen DianMao Digital Technology Co., Ltd.

<img src="https://raw.githubusercontent.com/mikolalysenko/mudb/master/img/logo.png" />

Written in Shenzhen, China.

(c) 2017 Mikola Lysenko, Shenzhen DianMao Digital Technology Co., Ltd.


