import { ChatSchema } from './schema';
import { MuServer, MuServerProtocol } from '../../server';

export class ChatServer {
    private protocol:MuServerProtocol<typeof ChatSchema>;

    public clients:{[sessionId:string]:string};

    constructor (server:MuServer) {
        this.protocol = server.protocol('chat', ChatSchema);

        this.protocol.configure({
            message:{
                setName: (client, name) => {
                    client.message.chat({
                        name: 'server',
                        text: `updated name to ${name}`,
                    });
                    this.clients[client.sessionId] = name;
                },
                say: (client, text) => {
                    this.protocol.broadcast.chat({
                        name: this.clients[client.sessionId],
                        text,
                    });
                },
            },
        });
    }
}