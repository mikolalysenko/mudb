import { createHash } from 'crypto';

import { MuServer } from 'mudb/server';
import { MuServerRPC } from '../server';
import { RPCSchema } from './schema';

export = function (server:MuServer) {
    const protocol = new MuServerRPC(server, RPCSchema);

    protocol.configure({
        // functions to be executed by RPCs from client go into `rpc`
        rpc: {
            // argument supplied by RPCs is available as the first argument
            hash: (secret, next) => {
                const digest = createHash('sha512').update(secret).digest('hex');

                // call `next()` when any exceptions occur or after having the return

                // when there is an exception, call `next()` with the error message:
                // next(errorMessage)
                // otherwise, always pass `undefined` as the first argument,
                // and return value as the second, as below

                // in this case, value of `digest` should match RPCSchema['server']['hash'][1]
                next(undefined, digest);
            },
        },

        // when client connects
        connect: (client) => {
            const set = [1, 2, 3, 4];

            // initiates a RPC of `sum()` to client

            // value of `set` is sent to client as argument of the remote `sum()`
            // its value should match RPCSchema['client']['sum'][0]

            // second argument is a callback called when return value arrives,
            // which is available as second argument of the callback
            // so `total` is the sum of `set`
            client.rpc.sum(set, (err, total) => {
                if (err) {
                    throw new Error(err);
                }
                console.log(`sum of ${set}: ${total}`);
            });
        },
    });

    // start server after configuring all server-side protocols
    server.start();
};
