
## Example

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

```js
import { RPCSchema } from './schema';
import { MuClient } from 'mudb/client';
import { MuRPCClient } from '../client';

export = function (client:MuClient) {
    const protocol = new MuRPCClient({client, RPCSchema});
    protocol.configure({
        ready: () => {
            let result = protocol.server.message.add(1, 2); //想这么实现来着
            let success = protocol.server.message.wait(1000, () => {
                console.log('done');
            })
        },
        message: {
            
        }
    })
}
```

### Server

```js
import { RPCSchema } from './schema';
import { MuServer } from 'mudb/server';
import { MuRPCServer } from '../server';

export = function (server:MuServer) {
    const protocol = new MuRPCServer({server, RPCSchema});
    protorol.configure({

    })
}
```


### Schema

```js
export const RPCSchema = {
    client: {

    },
    server: {

    },
}
```

