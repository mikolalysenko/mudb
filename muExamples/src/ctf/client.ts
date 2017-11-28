import { StateSchema, MsgSchema } from './schema';
import { MuClient } from 'mudb/client';
import { MuClientState } from 'mustate/client';
import { DBSchema } from '../pacman/schema';

export  = function(client:MuClient) {
    const canvas = document.createElement('canvas');
    canvas.style.padding = '0px';
    canvas.style.margin = '0px';
    canvas.width = 510;
    canvas.height = 510;
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      document.body.innerText = 'canvas not supported';
      return;
    }

    const stateProtocol = new MuClientState({
        schema: StateSchema,
        client,
    });

    const msgProtocol = client.protocol(MsgSchema);

    stateProtocol.configure({
        ready: () => {

        },
    });

    msgProtocol.configure({
        message: {

        },
    });

    client.start();
};
