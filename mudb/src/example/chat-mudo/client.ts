import { ChatSchema } from './schema';
import { MuClient } from '../../client';

export = function (client:MuClient) {
    const protocol = client.protocol(ChatSchema);

    const messageDiv = document.createElement('div');
    const messageStyle = messageDiv.style;
    messageStyle.overflow = 'auto';
    messageStyle.width = '400px';
    messageStyle.height = '300px';

    const textDiv = document.createElement('input');
    textDiv.type = 'text';
    const textStyle = textDiv.style;
    textStyle.width = '400px';
    textStyle.padding = '0px';
    textStyle.margin = '0px';

    document.body.appendChild(messageDiv);
    document.body.appendChild(document.createElement('br'));
    document.body.appendChild(textDiv);

    protocol.configure({
        ready: () => {
            textDiv.addEventListener('keydown', (ev) => {
                if (ev.keyCode === 13) {
                    const message = textDiv.value;
                    textDiv.value = '';
                    protocol.server.message.say(message);
                }
            });
        },
        message: {
            chat: ({name, text}) => {
                const textNode = document.createTextNode(`${name}: ${text}`);
                messageDiv.appendChild(textNode);
                messageDiv.appendChild(document.createElement('br'));
            },
        },
    });

    client.start();
};