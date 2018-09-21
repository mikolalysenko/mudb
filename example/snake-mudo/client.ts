import { SnakeSchema } from './schema';
import { MuClient } from 'mudb/client';
import { PointInterface, GameMap, Snake, DirectDict, Food } from './snakeAPI';
import { GameSchema } from './schema';

export = function (client:MuClient) {
    const protocol = client.protocol(GameSchema);

    const gameMap = document.createElement('div');
    gameMap.id = 'canvas';
    gameMap.style.cssFloat = 'left';
    gameMap.style.width = '800px';
    gameMap.style.margin = '0px 5px';
    document.body.appendChild(gameMap);

    const canvas = document.createElement('canvas');
    canvas.style.padding = '0px';
    canvas.style.margin = '0px';
    gameMap.appendChild(canvas);
    const map = new GameMap();
    const context = map.show(canvas);
    if (!context) {
        document.body.innerText = 'canvas not supported';
        return;
    }

    const board = document.createElement('div');
    board.style.cssFloat = 'left';
    board.style.width = '200px';
    document.body.appendChild(board);

    // const scoreBoard = document.createElement('div');
    // scoreBoard.style.width = '200px';
    // scoreBoard.style.height = '400px';
    // scoreBoard.style.cssFloat = 'left';
    // board.appendChild(scoreBoard);

    const logBoard = document.createElement('div');
    logBoard.style.width = '200px';
    logBoard.style.height = '200px';
    logBoard.style.cssFloat = 'left';
    board.appendChild(logBoard);

    let localSnakes:{id:string, body:PointInterface[], color:{head:string, body:string}}[] = [];
    let localFood:PointInterface[] = [];
    let direction:number = DirectDict.right;

    protocol.configure({
        ready: () => {
            document.onkeydown = (e) => {
                const ev = e || window.event;
                switch (ev.keyCode) {
                    case DirectDict.left:
                        direction = (direction === DirectDict.right) ? direction : DirectDict.left;
                        break;
                    case DirectDict.right:
                        direction = (direction === DirectDict.left) ? direction : DirectDict.right;
                        break;
                    case DirectDict.up:
                        direction = (direction === DirectDict.down) ? direction : DirectDict.up;
                        break;
                    case DirectDict.down:
                        direction = (direction === DirectDict.up) ? direction : DirectDict.down;
                        break;
                }
                ev.preventDefault();
                protocol.server.message.redirect(direction);
            };
        },
        message: { //message from server
            updateSnakes: (snakes) => {
                localSnakes = snakes;
                rect();
            },
            updateFood: (allFood) => {
                localFood = allFood;
                rect();
            },
            playerDead: (id) => {
                if (id === protocol.client.sessionId) {
                    gameMap.innerText = 'Game Over! Refresh to play again.';
                } else {
                    const textNode = document.createTextNode(id + ' dead');
                    logBoard.appendChild(textNode);
                    logBoard.appendChild(document.createElement('br'));
                }
            },
            newPlayer: (id) => {
                const textNode = document.createTextNode(id + ' joined');
                logBoard.appendChild(textNode);
                logBoard.appendChild(document.createElement('br'));
            },
        },
    });

    function rect() {
        if (context) {
            context.clearRect(0, 0, canvas.width, canvas.height);
            localSnakes.forEach((snake) => {
                Snake.draw(context, snake.body, snake.color);
            });
            localFood.forEach((food) => {
                Food.draw(context, food);
            });
        }
    }

    client.start();
};
