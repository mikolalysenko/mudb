import { SnakeSchema } from './schema';
import { MuClient } from '../../client';
import { PointInterface, Food, GameMap } from './snakeAPI';

export = function (client:MuClient) {
    const protocol = client.protocol(SnakeSchema);

    const map = new GameMap();
    map.show();

    protocol.configure({
        ready: () => {

        },

        message: {
            addFood: ({x, y}) => {
                console.log(x, y);
            },
        },
    });

    client.start();
};
