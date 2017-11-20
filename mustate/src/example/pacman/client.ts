import { GameSchema } from './schema';
import { MuClient } from 'mudb/client';
import { MuClientState } from '../../client';
import { Ghost } from './lib/Ghost';

export = function (client:MuClient) {
    const canvas = document.createElement('canvas');
    canvas.style.padding = '0px';
    canvas.style.margin = '0px';
    canvas.style.width = '510';
    canvas.style.height = '510';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        document.body.innerText = 'canvas not supported';
        return;
    }

    const protocol = new MuClientState({
        schema: GameSchema,
        client,
    });

    protocol.configure({
        ready: () => {

        },
    });

    client.start();
};
