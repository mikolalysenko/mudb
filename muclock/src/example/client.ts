import { MuClient } from 'mudb/client';
import { MuClockClient } from '../client';

export = function (client:MuClient) {
    const tickDiv = document.createElement('div');
    tickDiv.style.fontSize = '64pt';
    document.body.appendChild(tickDiv);

    const clock = new MuClockClient({
        client,
        tick: (tick) => {
            console.log('tick', tick);
        },
    });

    client.start({
        ready: () => {
            function render() {
                tickDiv.innerText = `tick ${clock.tick()}, ping ${clock.ping}`;
                requestAnimationFrame(render);
            }
            render();
        }
    });
}
