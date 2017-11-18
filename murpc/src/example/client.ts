import { RPCSchema } from './schema';
import { MuClient } from 'mudb/client';
import { MuRPCClient } from '../client';

export  = function (client:MuClient) {
    const protocol = new MuRPCClient(client, RPCSchema);
    protocol.configure({
        rpc: {
            combine: (arg, next) => {
                let result = 0;
                arg.forEach((element) => { result += element; });
                next('succss', result);
            },
        },
        ready: () => {
            console.log('client ready');
            protocol.server.rpc.combine([4, 10, 15], (result) => {
                console.log('rpc combine result:', result);
            });
        },
    });
    client.start();
};
