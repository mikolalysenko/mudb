
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
            protocol.server.rpc.add(1, 2, (result) => {
                // result === 3
            });
            protocol.server.rpc.wait(1000, (info) => {
                if (info === 'success') console.log('done');
                else console.log('fail');
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
                let result = args[0] + args[1];
                next(result);
            },
            wait: (args, next) => {
                setTimeout(() => {
                    next('success');
                }, args[0]);
                next('fail');
            }
        }
    })
}
```


### Schema
---

```js
import { MuVoid } from 'muschema/void'

export const RPCSchema = {
    client: {

    },
    server: {
        add: {
            0: new MuArray(new MuInt8()),
            1: new MuVoid(),
        },
        wait: {
            0: new MuInt8(),
            1: new MuVoid(),
        }
    },
}
```

