import { ChatSchema } from './schema';
import { MuClient, MuClientProtocol } from '../../client';

export class ChatMessage {
    public name:string;
    public text:string;

    constructor (name, text) {
        this.name = name;
        this.text = text;
    }
}

export class ChatClient {
    private protocol:MuClientProtocol<typeof ChatSchema>;

    public name:string;
    public log:ChatMessage[] = [];

    constructor (client:MuClient, container:HTMLElement) {
        this.protocol = client.protocol(ChatSchema);

        this.protocol.configure({
            message: {
                chat: ({name, text}) => this.log.push(new ChatMessage(name, text)),
            },
            close: () => {
            },
        });
    }

    public say (text:string) {
        this.protocol.server.message.say(text);
    }

    public setName (name:string) {
        this.protocol.server.message.setName(name);
    }
}