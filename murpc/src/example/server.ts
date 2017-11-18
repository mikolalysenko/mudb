import { RPCSchema } from './schema';
import { MuServer } from 'mudb/server';
import { MuRPCServer } from '../server';

export = function (server:MuServer) {
    const protocol = new MuRPCServer(server, RPCSchema);

    const NodeVersion = 'v9.0.0';
    const clientBrowser = {};

    protocol.configure({
        ready: () => {
            console.log('server ready');
        },
        rpc: {
            combine: (arg, next) => {
                let result = 0;
                arg.forEach((element) => { result += element; });
                next('success', result);
            },
            getEnvironment: (arg, next) => {
                if (arg) {
                    console.log(arg);
                }
            },
        },
        connect: (client) => {
            console.log(client.sessionId, 'connected');
            client.rpc.combine([1, 2, 3], (result) => {
                console.log('receive combine result:', result);
            });
            client.rpc.getEnvironment(NodeVersion, (result) => {
                console.log(client.sessionId, ':', result);
                clientBrowser[client.sessionId] = result;
            });
        },
    });
    server.start();
};
