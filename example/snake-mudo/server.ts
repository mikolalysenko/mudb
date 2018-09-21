import { GameSchema } from './schema';
import { MuServer } from 'mudb/server';
import { Snake, PointInterface, Food } from './snakeAPI';

export  = function (server:MuServer) {
    const protocol = server.protocol(GameSchema);

    let snakes:{id:string, body:PointInterface[], color:{head:string, body:string}}[] = []; //FIXME: id can delete
    const allFood:PointInterface[] = [];
    const snakeObjs:{[id:string]:Snake} = {};
    const timeInterval:number = 100;
    const foodNum = 3;

    protocol.configure({
        ready: () => {
            for (let i = 0; i < foodNum; i++) {
                allFood.push(Food.new());
            }

            setInterval(() => {
                snakes = [];
                Object.keys(snakeObjs).forEach((id) => {
                    let snakeIsDead = false;
                    const snake = snakeObjs[id];
                    snake.move(
                        allFood,
                        () => { protocol.broadcast.updateFood(allFood); },
                        () => {
                            delete snakeObjs[id];
                            protocol.broadcast.playerDead(id);
                            snakeIsDead = true;
                         });
                    if (!snakeIsDead) {
                        snakes.push(snake.toData());
                    }
                });
                protocol.broadcast.updateSnakes(snakes);
            },          timeInterval);
        },
        message: { // message from client
            redirect: (client, redirect) => {
                const snake = snakeObjs[client.sessionId];
                if (snake) {
                    snake.direction = redirect;
                }
            },
        },
        connect: (client) => {
            const snake = new Snake(client.sessionId, undefined, undefined, {
                head: getRandomColor(),
                body: getRandomColor(),
            });
            snakeObjs[snake.id] = snake;
            snakes.push(snake.toData());
            protocol.broadcast.newPlayer(client.sessionId);
            protocol.broadcast.updateSnakes(snakes);
            protocol.broadcast.updateFood(allFood);
        },
        disconnect: (client) => {
            delete snakeObjs[client.sessionId];
            // TODO: update snakes
            // protocol.broadcast.updateSnakes(snakes);
        },
    });

    function getRandomColor() : string {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (var i = 0; i < 6; i++) {
          color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    server.start();
};
