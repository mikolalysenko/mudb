import { MuClient } from 'mudb/client';
import { MuClockClient } from 'mudb/clock/client';

export = function (client:MuClient) {
    const tickDiv = document.createElement('div');
    tickDiv.style.fontSize = '64pt';
    document.body.appendChild(tickDiv);

    const clock = new MuClockClient({
        client,
        tick: (tickCount) => {
            // whatever you want to do on tick
            console.log(tickCount);
        },
    });
    client.start({
        ready: () => {
            function render() {
                tickDiv.innerHTML = `clock ${Math.round(clock.tick() * 100) / 100}`;
                requestAnimationFrame(render);
            }
            render();
        },
    });
};
