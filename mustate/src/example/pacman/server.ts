import { GameSchema } from './schema';
import { MuServer } from 'mudb/server';
import { MuServerState } from '../../server';

export = function (server:MuServer) {
    const protocol = new MuServerState({
        schema: GameSchema,
        server,
        windowSize: 0,
    });

    protocol.configure({
        state: (client, {}) => {

        },
        connect: (client) => {

        },
        disconnect: (client) => {

        },
    });
    server.start();
};
