import { GameSchema } from './schema';
import { MuServer } from '../../server';
import { Snake } from './snakeAPI';

export  = function (server:MuServer) {
    const protocol = server.protocol(GameSchema);

    const snakes:{id:string, body:{x:number, y:number}[], color:{head:string, body:string}}[] = [];
    const foods:{id:string, point:{x:number, y:number}}[] = [];
    const snakeObjs:Snake[] = [];

    protocol.configure({
        ready: () => {
            // window.setInterval(() => {
            //     snakeObjs.forEach(snakeObj => {
            //         snakeObj.move();
            //     });
            // });
        },
        message: { // message from client
            redirect: (client, redirect) => {
                console.log('server redirect');
            },
        },
        connect: (client) => {
            const snake = new Snake(client.sessionId);
            snakeObjs.push(snake);
            snakes.push({
                id: snake.id,
                body: snake.body,
                color: snake.color});
            console.log('-------server------');
            console.dir(snakes);
            protocol.broadcast.updateSnakes(snakes);
        },
        // TODO: disconnect
    });

    server.start();
};
