# murpc
Remote procedure calls for mudb

# example
**schema.ts**
```js
// import the necessary muschema
import {
    MuInt8,
    MuString,
    MuArray,
    MuDictionary,
} from 'muschema';

export const RPCSchema = {
    client: {
        combine: {
            0: new MuArray(new MuInt8()), //arg
            1: new MuInt8(), //response
        }
    },
    server: {
        combine: {
            0: new MuArray(new MuInt8()), //arg
            1: new MuInt8(), //response
        }
    },
};
```

**server.ts**
```js
import { RPCSchema } from './schema';
import { MuServer } from 'mudb/server';
import { MuRPCServer } from '../server';

export = function (server:MuServer) {
    const protocol = new MuRPCServer(server, RPCSchema);

    protocol.configure({
        // all the methods are defined in rpc
        // handle the rpc calls from client
        rpc: {
            // arg:RPCSchema['server'][method]['0']['identity']
            // next:(err:string|undefined, response:RPCSchema['server'][method]['1']['identity']) => void
            combine: (arg, next) => {
                let result = 0;
                arg.forEach((element) => { result += element; });
                next(undefined, result);
                // if error: next(error_message, result);
            }
        },
        connect: (client) => {
            // send rpc call to client
            client.rpc.combine([1, 2, 3], (result) => {
                console.log('receive combine result:', result);
            });
        },
    });
    server.start();
};
```

**client.ts**
```js
import { RPCSchema } from './schema';
import { MuClient } from 'mudb/client';
import { MuRPCClient } from '../client';

export  = function (client:MuClient) {
    const protocol = new MuRPCClient(client, RPCSchema);

    protocol.configure({
        // handle the rpc calls from server
        rpc: {
            // arg:RPCSchema['client'][method]['0']['identity']
            // next:(err:string|undefined, response:RPCSchema['client'][method]['1']['identity']) => void
            combine: (arg, next) => {
                let result = 0;
                arg.forEach((element) => { result += element; });
                next(undefined, result);
            },
        },
        ready: () => {
            // send rpc call to server
            protocol.server.rpc.combine([4, 10, 15], (result) => {
                console.log('rpc combine result:', result);
            });
        },
    });
    client.start();
}
```

# table of contents

# install #

```
npm install
```

# api #

## protocol schema ##
Any `mustate` project should specify a protocol schema using `muschema`. Each protocol includes two protocol interfaces, one for client and one for server.

The rpc method names should be defined in both client and server. Each method contains two keys: `0` for arguments data type and `1` for response data type.

**Example:**
```js
export const RPCSchema = {
    client: {
        combine: {
            0: new MuArray(new MuInt8()), //arg
            1: new MuInt8(), //response
        }
    },
    server: {
        combine: {
            0: new MuArray(new MuInt8()), //arg
            1: new MuInt8(), //response
        }
    },
};
```

## server ##
A server in `mustate` processes rpc from many clients, and send rpc to one client or broadcast to all clients.

### server constructor ###
`mustate/server` exports the constructor for the server. It taks an object which accepts the following arguments:

- `server` which is the `MuServer` object, see `mudb` for details.
- `schema` which is the protocol schema as described above.

**Example:**
```js
import { RPCSchema } from './schema';
import { MuServer } from 'mudb/server';
import { MuRPCServer } from '../server';

export = function(server:MuServer) {
    const protocol = new MuRPCServer(server, RPCSchema);
}
```


### server configure ###
The next step is to register event handlers, this is done using the `MuRPCServer.configure` method. This method takes an object that has the following properties:

- `rpc` which is an object containing implementations of handlers for all of the rpc types. It should strict follow the rules as `protocol schema` defines.
- `ready()` which is called when the server is started.
- `connect(client)` called when a client connects to the server.
- `disconnect(client)` called when a client disconnects from the server.
- `close()` called when the server socket is closed.

**Example:**
```js
protocol.configure({
    ready: () => { console.log('server start'); },
    rpc: {
        method_name: (arg, next) => {
            console.log('received rpc call');
        },
    },
    connect: (client) => { console.log(client.sessionId, 'connected'); },
    disconnect: (client) => { console.log(client.sessionId, 'disconnect'); },
    close: () => { console.log('protocol closed'); }
}
```

### remote clients ###
A server could get an array of remote clients: `MuRPCServer.clients`. Each client object includes `sessionId` and `rpc` properties. The `sessionId` can be used to find a client, and `rpc` could send the client a rpc call.

**Example:**
```js
protocol.clients[0].rpc['method_name'](arg, (result) => {
    console.log('receive the rpc result:', result);
})
```

### start ###
When all the event handlers are setting done, the last step is to start the server: `server.start()`.

## client ##
A client in `mustate` sends the rpc to the server, and also it can receive the rpc from the server.

### client constructor ###
`mustate/client` exports the constructor for the client. It taks an object which accepts the following arguments:

- `client` which is the `MuClient` object, see `mudb` for details.
- `schema` which is the protocol schema as described above.

**Example:**
```js
import { RPCSchema } from './schema';
import { MuClient } from 'mudb/client';
import { MuRPCClient } from '../client';

export  = function (client:MuClient) {
    const protocol = new MuRPCClient(client, RPCSchema);
}
```

### client configure ###
The next step is to register event handlers just as the server, this is done using the `MuRPCClient.configure` method. This method has following properties:

- `rpc` which is an object containing implementations of handlers for all of the rpc types. It should strict follow the rules as `protocol schema` defines.
- `ready()` which is called when the client is started.
- `close()` called when the client protocol is closed.

**Example:**
```js
protocol.configure({
    ready: () => { console.log('client start'); },
    rpc: {
        method_name: (arg, next) => {
            console.log('received rpc call');
        },
    },
    close: () => { console.log('protocol closed'); }
}
```

### remote server ###
A client could get the remote server by using `MuRPCServer.clients`. The server object has `rpc` property, which can be used to send rpc methods.

**Example:**
```js
protocol.server.rpc['method_name'](arg, (result) => {
    console.log('receive the rpc result:', result)
})
```

### start ###
As the server, the `client.start()` should be called to start the service.




# credits
Development supported by Shenzhen DianMao Digital Technology Co., Ltd.

<img src="https://raw.githubusercontent.com/mikolalysenko/mudb/master/img/logo.png" />

Written in Shenzhen, China.

(c) 2017 Mikola Lysenko, Shenzhen DianMao Digital Technology Co., Ltd.
