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
        canvas.style.border = '1px solid';
        context.fillStyle = '#fff';
        return context;
    }
}

export type SnakeBody = {x:number, y:number}[];
export type SnakeColor = {head:string, body:string};

export class Snake {
    public color:SnakeColor;
    public body:SnakeBody;
    public readonly id:string;
    public redirect:string;

    constructor(
            id:string,
            bodyLength:number=4,
            redirect:string='right',
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
        this.redirect = redirect;
    }

    public move() {
        console.log('move');
    }

    public static draw(context:CanvasRenderingContext2D, body:SnakeBody, color:SnakeColor) {
        let bodyArray:SnakeBody = [];
        if (!(body instanceof Array)) {
            bodyArray = Object.keys(body).map((key) => body[key]);
        } else {
            bodyArray = body;
        }
        rect(context, bodyArray[0], color.head);
        // for (let i = 1; i < bodyArray.length; i++) {
        //     rect(context, bodyArray[i], color.body);
        // }
    }
}

function rect(context:CanvasRenderingContext2D, point:PointInterface, color:string) : void {
    console.log('rect pointX', (point.x * config.size), 'color:', color);
    context.beginPath();
    context.fillStyle = color;
    context.rect(point.x * config.size, point.y * config.size, config.size, config.size);
    context.fill();
    context.stroke();
}
