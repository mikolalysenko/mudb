import { SnakeSchema } from './schema';
import { MuServer } from '../../server';

export  = function (server:MuServer) {
    const protocol = server.protocol(SnakeSchema);

    protocol.configure({
        message: {
            redirect: (client, redirect) => {
                console.log('server redirect');
            },
        },
        connect: (client) => {
            // TODO: add client info to snakes[]
        },
        // TODO: disconnect
    });

    server.start();
};
