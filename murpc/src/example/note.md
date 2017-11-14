
## Example
---

The example methods:
```js
function add(a, b){
    return a+b;
}

function wait(time, next){
    setTimeout(() => {
        next;
        return true;
    }, time);
    return false;
}
```

### Client
---

```js
import { RPCSchema } from './schema';
import { MuClient } from 'mudb/client';
import { MuRPCClient } from '../client';

export = function (client:MuClient) {
    const protocol = new MuRPCClient({client, RPCSchema});
    protocol.configure({
        ready: () => {
            let result = protocol.server.rpc.add(1, 2); //参考mustate.eg.client.46
            let success = protocol.server.rpc.wait(1000, () => {
                console.log('done');
            })
        }
    })
}
```

### Server
---

```js
import { RPCSchema } from './schema';
import { MuServer } from 'mudb/server';
import { MuRPCServer } from '../server';

export = function (server:MuServer) {
    const protocol = new MuRPCServer({server, RPCSchema});
    protorol.configure({
        ready: () => {

        },

        rpc: {
            add: (args, next) => {
                let result = args[0] + args[1]; // ?
                next;
            },
            wait: (args, next) => {

            }
        }
    })
}
```


### Schema
---

```js
export const RPCSchema = {
    client: {

    },
    server: {
        add: new MuStruct({
            0: new MuArray(new MuInt8());
            1: new //should be function
        })
    },
}
```

