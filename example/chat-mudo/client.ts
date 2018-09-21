import { ChatSchema } from './schema';
import { MuClient } from 'mudb/client';

export = function (client:MuClient) {
    const protocol = client.protocol(ChatSchema);

    const messageDiv = document.createElement('div');
    const messageStyle = messageDiv.style;
    messageStyle.overflow = 'auto';
    messageStyle.width = '400px';
    messageStyle.height = '300px';

    const textInput = document.createElement('input');
    textInput.type = 'text';
    const textStyle = textInput.style;
    textStyle.width = '300px';
    textStyle.padding = '0px';
    textStyle.margin = '0px';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.style.width = '300px';
    nameInput.style.padding = textStyle.padding;
    nameInput.style.margin = textStyle.margin;

    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'Your name: ';
    const textLabel = document.createElement('label');
    textLabel.textContent = 'message:  ';

    document.body.appendChild(messageDiv);
    document.body.appendChild(document.createElement('br'));
    document.body.appendChild(nameLabel);
    document.body.appendChild(nameInput);
    document.body.appendChild(document.createElement('br'));
    document.body.appendChild(textLabel);
    document.body.appendChild(textInput);

    protocol.configure({
        ready: () => {
            console.log('ready!');
            textInput.addEventListener('keydown', (ev) => {
                if (ev.keyCode === 13) {
                    protocol.server.message.say(textInput.value); //MuRemoteServer
                    textInput.value = '';
                }
            });

            nameInput.addEventListener('keydown', (ev) => {
                if (ev.keyCode === 13) {
                    protocol.server.message.setName(nameInput.value);
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
        close: () => {
            console.log('client closed');
        },
    });

    client.start();
};
