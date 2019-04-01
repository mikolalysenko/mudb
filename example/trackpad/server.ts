import { MuServer } from '../../server';
import { MuDeltaServer } from '../../delta/server';
import { PlayerSetSchema, ControllerSchema } from './schema';

export = (server:MuServer) => {
    const deltaServer = new MuDeltaServer({
        server: server,
        schema: PlayerSetSchema,
    });

    const players = {};

    const playProtocol = server.protocol(ControllerSchema);
    playProtocol.configure({
        connect: (client) => {
            players[client.sessionId] = {
                x: 0,
                y: 0,
                color: `#${Math.floor(Math.random() * 0xefffff + 0x100000).toString(16)}`,
            };
            deltaServer.publish(players);
        },
        message: {
            move: (client, data) => {
                const { x, y } = data;
                players[client.sessionId].x = x;
                players[client.sessionId].y = y;
                deltaServer.publish(players);
            },
        },
        disconnect: (client) => {
            delete players[client.sessionId];
            deltaServer.publish(players);
        },
    });

    server.start();
};
