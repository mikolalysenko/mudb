const config = {
    size: 10,
    mapWidth: 800,
    mapHeight: 600,
};

export interface PointInterface {
    x:number;
    y:number;
}

export class GameMap {
    public height:number;
    public width:number;

    constructor(width:number=config.mapWidth,
                height:number=config.mapHeight) {
        this.height = height;
        this.width = width;
    }

    public show(canvas:HTMLCanvasElement) : CanvasRenderingContext2D|undefined {
        const context = canvas.getContext('2d');
        if (!context) {
            return;
        }
        canvas.width = this.width;
        canvas.height = this.height;
        canvas.style.border = 'solid 1px';
        context.fillStyle = '#fff';
        return context;
    }
}

export type SnakeBody = {x:number, y:number}[];
export type SnakeColor = {head:string, body:string};

export const DirectDict = {
    left: 37,
    up: 38,
    right: 39,
    down: 40,
};

export class Food {
    public static new(color:string = 'green') : PointInterface {
        const x = getRandomNumber(0, config.mapWidth / config.size - 1);
        const y = getRandomNumber(0, config.mapHeight / config.size - 1);
        return {x: x, y: y};
    }

    public static draw(context:CanvasRenderingContext2D, food:PointInterface, color:string = 'green') {
        rect(context, food, color);
    }
}

function rect(context:CanvasRenderingContext2D, point:PointInterface, color:string) : void {
    context.beginPath();
    context.fillStyle = color;
    context.rect(point.x * config.size, point.y * config.size, config.size, config.size);
    context.fill();
    // context.stroke();
}

function getRandomNumber(min, max) {
    const range = max - min;
    const r = Math.random();
    return Math.round(r * range + min);
}

export class Snake {
    public color:SnakeColor;
    public body:SnakeBody;
    public readonly id:string;
    public direction:number;

    constructor(
            id:string,
            bodyLength:number=4,
            direction:number=DirectDict.right,
            color:SnakeColor={head:'red', body:'black'}) {
        this.id = id;
        this.color = color;
        this.body = [];
        // Generate the snake body
        const snakehead = {x: bodyLength, y: 1};
        this.body.push(snakehead);
        for (let i = bodyLength - 1; i > 0; i--) {
            this.body.push({x:i, y:1});
        }
        this.direction = direction;
    }

    private eatFood(allFood) : boolean {
        let result = false;
        allFood.forEach((food) => {
            if (food && this.body[0].x === food.x && this.body[0].y === food.y) {
                allFood.splice(allFood.indexOf(food), 1);
                allFood.push(Food.new());
                result = true;
            }
        });
        return result;
    }

    public move(allFood:PointInterface[], eatFood:() => void, gameOver:() => void) {
        // body move
        const newHead = {x:this.body[0].x, y:this.body[0].y};
        this.body.splice(1, 0, newHead);

        if (this.eatFood(allFood)) {
            eatFood();
        } else {
            this.body.pop();
        }

        // snake head move
        switch (this.direction) {
            case DirectDict.left:
                this.body[0].x --;
                break;
            case DirectDict.up:
                this.body[0].y --;
                break;
            case DirectDict.right:
                this.body[0].x ++;
                break;
            case DirectDict.down:
                this.body[0].y ++;
                break;
            default:
                break;
        }

        if (this.body[0].x * config.size > config.mapWidth || this.body[0].x < 0 || this.body[0].y * config.size > config.mapHeight || this.body[0].y < 0) {
            gameOver();
        }

        for (let i = 1; i < this.body.length; i++) {
            if (this.body[0].x === this.body[i].x && this.body[0].y === this.body[i].y) {
                gameOver();
            }
        }
        // TODO: touch other snake
    }

    public toData() : {id:string, body:{x:number, y:number}[], color:{head:string, body:string}} {
        return {
            id: this.id,
            body: this.body,
            color: this.color,
        };
    }

    public static draw(context:CanvasRenderingContext2D, body:SnakeBody, color:SnakeColor) {
        let bodyArray:SnakeBody = [];
        if (!(body instanceof Array)) {
            bodyArray = Object.keys(body).map((key) => body[key]);
        } else {
            bodyArray = body;
        }
        rect(context, bodyArray[0], color.head);
        for (let i = 1; i < bodyArray.length; i++) {
            rect(context, bodyArray[i], color.body);
        }
    }
}
