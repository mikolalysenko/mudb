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
            combine: (args, next:(err:string|undefined, response?:any) => void) => {
                console.log('server: receive combine');
                let result = '';
                args.forEach((element) => {
                    result += element;
                });
                next(undefined, result);
            },
            square: (arg:number, next:(err:string|undefined, response?:any) => void) => {
                next(undefined, arg * arg);
            },
        },
        connect: (client) => {
            console.log('server receive client:', client.sessionId);
        },
    });
    server.start();
};
