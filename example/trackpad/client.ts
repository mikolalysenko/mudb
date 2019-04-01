import { MuClient } from '../../client';
import { MuDeltaClient } from '../../delta/client';
import { PlayerSetSchema, ControllerSchema } from './schema';

export = function (client:MuClient) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
        document.body.innerText = 'canvas not supported';
        return;
    }

    canvas.style.padding = '0px';
    canvas.style.margin = '0px';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);

    function draw (players) {
        if (!context) {
            return;
        }

        context.fillStyle = '#fff';
        context.fillRect(0, 0, canvas.width, canvas.height);

        Object.keys(players).forEach((id) => {
            const { color, x, y } = players[id];
            context.fillStyle = color;
            context.fillRect(x * canvas.width - 10, y * canvas.height - 10, 10, 10);
        });
    }

    const deltaClient = new MuDeltaClient({
        client: client,
        schema: PlayerSetSchema,
    });
    deltaClient.configure({
        change: (state) => {
            requestAnimationFrame(() => draw(state));
        },
    });

    const playProtocol = client.protocol(ControllerSchema);
    playProtocol.configure({
        ready: () => {
            canvas.addEventListener('mousemove', (ev) => {
                playProtocol.server.message.move({
                    x: ev.clientX / canvas.width,
                    y: ev.clientY / canvas.height,
                });
            });
        },
        message: () => { },
    });

    client.start();
};
