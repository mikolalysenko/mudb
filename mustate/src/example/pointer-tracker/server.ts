import { GameSchema } from './schema';
import { MuServer } from 'mudb/server';
import { MuServerState } from '../server';

export = function (server:MuServer) {
    const protocol = new MuServerState({
        schema: GameSchema,
        server,
        windowSize: 0,
    });

    protocol.configure({
        state: (client, { x, y, color }) => {
            protocol.state[client.sessionId] = { x, y, color };
            protocol.commit();
        },
        connect: (client) => {
            protocol.state[client.sessionId] = {
                x: 0,
                y: 0,
                color: '#fff',
            };
            protocol.commit();
        },
        disconnect: (client) => {
            delete protocol.state[client.sessionId];
            protocol.commit();
        },
    });

    server.start();
};
