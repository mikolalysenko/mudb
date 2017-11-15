import { RPCSchema } from './schema';
import { MuClient } from 'mudb/client';
import { MuRPCClient } from '../client';

export  = function (client:MuClient) {
    const protocol = new MuRPCClient(client, RPCSchema);
    protocol.configure({
        rpc: {

        },
        ready: () => {
            console.log('client ready');
            protocol.server.rpc.combine([4, 10], (result) => {
                console.log('rpc combine result:', result);
            });
            // protocol.server.rpc.square(5, (result) => {
            //     console.log('rpc square result:', result);
            // });
        },
    });
    client.start();
};
