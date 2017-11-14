import { RPCSchema } from './schema';
import { MuServer } from 'mudb/server';
import { MuRPCServer } from '../server';

export = function (server:MuServer) {
    const protocol = new MuRPCServer(server, RPCSchema);
    protocol.configure({
        rpc: {
            combine: (args, next) => {
                let result = '';
                args.forEach((element) => {
                    result += element;
                });
                next(result);
            },
        },
        connect: (client) => {
            console.log('server receive client:', client.sessionId);
        },
    });
    server.start();
};
