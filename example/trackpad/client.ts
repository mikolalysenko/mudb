import { GameSchema } from './schema';
import { MuClient } from 'mudb/client';
import { MuClientState } from 'mudb/state/client';

export = function (client:MuClient) {
    const canvas = document.createElement('canvas');
    canvas.style.padding = '0px';
    canvas.style.margin = '0px';
    document.body.appendChild(canvas);
    const context = canvas.getContext('2d');
    if (!context) {
        document.body.innerText = 'canvas not supported';
        return;
    }

    const protocol = new MuClientState({
        schema: GameSchema,
        client,
        windowSize: 0,
    });

    protocol.configure({
        ready: () => {
            draw();
            canvas.addEventListener('mousemove', (ev) => {
                protocol.state.x = ev.clientX / canvas.width;
                protocol.state.y = ev.clientY / canvas.height;
                protocol.commit();
            });
            protocol.state.color = `#${Math.floor(Math.random() * 0xefffff + 0x100000).toString(16)}`;
            protocol.commit();
        },
    });

    function draw () {
        if (!context || !client.running) {
            return;
        }
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        context.fillStyle = '#fff';
        context.fillRect(0, 0, canvas.width, canvas.height);

        Object.keys(protocol.server.state).forEach((id) => {
            const {x, y, color} = protocol.server.state[id];
            context.fillStyle = color;
            context.fillRect(x * canvas.width - 10, y * canvas.height - 10, 10, 10);
        });

        context.fillStyle = protocol.state.color;
        context.fillRect(protocol.state.x * canvas.width - 15, protocol.state.y * canvas.height - 15, 15, 15);
        requestAnimationFrame(draw);
    }

    client.start();
};
