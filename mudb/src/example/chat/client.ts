import { ChatSchema } from './schema';
import { MuClient, MuClientProtocol } from '../../client';

export class ChatClient {
    private protocol:MuClientProtocol<typeof ChatSchema>;

    constructor (client:MuClient, container:HTMLElement) {
        this.protocol = client.protocol(ChatSchema);

        const messageDiv = document.createElement('div');
        const messageStyle = messageDiv.style;

        const textDiv = document.createElement('input');
        textDiv.type = 'text';
        const textStyle = textDiv.style;
        textStyle.width = '100%';
        textStyle.padding = '0px';
        textStyle.margin = '0px';
        textStyle.position = 'absolute';
        textStyle.bottom = '0px';
        textStyle.left = '0px';
        textStyle.right = '0px';

        this.protocol.configure({
            ready: () => {
                container.appendChild(messageDiv);
                container.appendChild(textDiv);
                textDiv.addEventListener('keydown', (ev) => {
                    if (ev.keyCode === 13) {
                        const message = textDiv.textContent;
                        textDiv.
                    }
                })
            },
            message: {
                chat: ({name, text}) => {
                    const textNode = document.createTextNode(`${name}: ${text}`);
                    messageDiv.appendChild(textNode);
                },
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