/*
import { MuClient } from 'mudb/client';
import { MuRPCClient } from 'murpc/client';
import { RPCSchema } from './schema';

export = function (client:MuClient) {
    const protocol = new MuRPCClient(client, RPCSchema);

    protocol.configure({
        // functions to be executed by RPCs from server go into `rpc`
        rpc: {
            // argument supplied by RPCs is available as the first argument
            sum: (set, next) => {
                const total = set.reduce((acc, num) => acc + num);

                // call `next()` when any exceptions occur or after having the return

                // when there is an exception, call `next()` with the error message:
                // next(errorMessage)
                // otherwise, always pass `undefined` as the first argument,
                // and return value as the second

                // in this case, value of `total` should match RPCSchema['client']['sum'][1]
                next(undefined, total);
            },
        },

        // when client is ready to handle messages
        ready: () => {
            const secret = Math.random().toString(36).substr(2, 11);

            // initiates an RPC of `hash()` to server

            // value of `secret` is sent to server as argument of the remote `hash()`
            // its value should match RPCSchema['server']['hash'][0]

            // second argument is a callback called when return value arrives,
            // which is available as the argument of the callback, so `digest` is the hash value of `secret`
            protocol.server.rpc.hash(secret, (digest) => {
                console.log('secret digest:', digest);
            });
        },
    });

    // start client after configuring all client-side protocols
    client.start();
};
*/