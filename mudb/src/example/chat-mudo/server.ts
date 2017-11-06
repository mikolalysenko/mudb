import { ChatSchema } from './schema';
import { MuServer } from '../../server';

export = function (server:MuServer) {
    const protocol = server.protocol(ChatSchema);

    const clientNames:{[id:string]:string} = {};

    protocol.configure({
        message: {
            say: (client, text) => {
                protocol.broadcast.chat({
                    name: clientNames[client.sessionId],
                    text,
                });
            },
            setName: (client, name) => {
                protocol.broadcast.chat({
                    name: 'server',
                    text: `${clientNames[client.sessionId]} changed name to ${name}`,
                });
                clientNames[client.sessionId] = name;
            },
        },
        connect: (client) => {
            clientNames[client.sessionId] = client.sessionId;
            protocol.broadcast.chat({
                name: 'server',
                text: `${clientNames[client.sessionId]} joined`,
            });
        },
        disconnect: (client) => {
            protocol.broadcast.chat({
                name: 'server',
                text: `${clientNames[client.sessionId]} left`,
            });
        },
    });

    server.start();
};
