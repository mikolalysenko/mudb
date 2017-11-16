import { MuClient } from 'mudb/client';
import { MuClockClient } from '../client';

export = function (client:MuClient) {
    const tickDiv = document.createElement('div');
    tickDiv.style.fontSize = '64pt';
    document.body.appendChild(tickDiv);

    const clock = new MuClockClient({
        client,
        tick: (tick) => {
        },
    });

    client.start({
        ready: () => {
            console.log('client ready');
            function render() {
                tickDiv.innerHTML = `tick ${Math.round(clock.tick() * 100) / 100}<br/> ping ${clock.ping()}`;
                requestAnimationFrame(render);
            }
            render();
        },
    });
};
