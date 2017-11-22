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
        state: (client, {x, y, color, dir, mouthOpen, isLive}) => {
            protocol.state[client.sessionId] = {x, y, color, dir, mouthOpen, isLive};
            protocol.commit();
        },
        connect: (client) => {

        },
        disconnect: (client) => {
            protocol.state[client.sessionId]['isLive'] = false;
            protocol.commit();
            delete protocol.state[client.sessionId];
        },
    });
    server.start();
};
