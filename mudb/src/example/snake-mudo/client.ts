import { SnakeSchema } from './schema';
import { MuClient } from '../../client';
import { PointInterface, GameMap, Snake } from './snakeAPI';
import { GameSchema } from './schema';

export = function (client:MuClient) {
    const protocol = client.protocol(GameSchema);

    const canvas = document.createElement('canvas');
    canvas.id = 'canvas';
    canvas.style.padding = '0px';
    canvas.style.margin = '0px';
    document.body.appendChild(canvas);
    const map = new GameMap();
    const context = map.show(canvas);
    if (!context) {
        document.body.innerText = 'canvas not supported';
        return;
    }

    const existSnakes:string[] = [];

    protocol.configure({
        ready: () => {
            //
        },
        message: { //message from server
            updateSnakes: (snakes) => {
                console.log('-----client------');
                console.dir(snakes);
                snakes.forEach((snake) => {
                    Snake.draw(context, snake.body, snake.color);
                });
            },
        },
    });

    client.start();
};
