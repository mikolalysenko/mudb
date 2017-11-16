import { RPCSchema } from './schema';
import { MuServer } from 'mudb/server';
import { MuRPCServer } from '../server';

export = function (server:MuServer) {
    const protocol = new MuRPCServer(server, RPCSchema);
    protocol.configure({
        ready: () => {
            console.log('server ready');
        },
        rpc: {
            combine: (arg, next) => {
                let result = 0;
                arg.forEach((element) => {
                    result += element;
                });
                next('success', result);
            },
        },
        connect: (client) => {
            console.log(client.sessionId, 'connected');
        },
    });
    server.start();
};
