import { ChatSchema } from './schema';
import { MuServer } from '../../server';

export = function (server:MuServer) {
    const protocol = server.protocol(ChatSchema);

    protocol.configure({
        message: {
            say: (client, text) => {
                protocol.broadcast.chat({
                    name: client.sessionId,
                    text,
                });
            },
        },
    });

    server.start();
};