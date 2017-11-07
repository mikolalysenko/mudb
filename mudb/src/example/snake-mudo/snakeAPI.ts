export interface PointInterface {
    x:number;
    y:number;
}

const Spec = {
    size: 20,
    mapWidth: 800,
    mapHeight: 600,
};

interface FoodInterface {
    pointX:number;
    pointY:number;
}

export class GameMap {
    public height:number;
    public width:number;

    constructor(width:number=Spec.mapWidth,
                height:number=Spec.mapHeight) {
        this.height = height;
        this.width = width;
    }

    public show() : void {
        const main = document.createElement('div');
        main.style.width = this.width + 'px';
        main.style.height = this.height + 'px';
        main.style.border = '1px solid';
        document.body.appendChild(main);
    }
}

export class Food {
    public point:PointInterface;
    private div:HTMLElement;

    constructor(point:PointInterface={
        x:Math.floor(Math.random() * Spec.mapWidth / Spec.size),
        y:Math.floor(Math.random() * Spec.mapHeight / Spec.size),
    }) {
        this.point = point;
    }

    private createDiv() : void {
        this.div = document.createElement('div');
        this.div.style.width = this.div.style.height = Spec.size + 'px';
        this.div.style.backgroundColor = 'green';
        this.div.style.position = 'absolute';
        document.body.appendChild(this.div);
    }

    public show() : void {
        const foodDiv = document.createElement('div');
        if (this.div) {
            this.createDiv();
        }
        this.div.style.left = setPoint(this.point.x);
        this.div.style.top = setPoint(this.point.y);
    }
}

const food = new Food();

class Snake {
    private snakebody:{
        point:PointInterface,
        color:string,
        div:any,
    }[] = [];
    public redirect:string;

    constructor(bodyLength:number = 4) {
        const snakehead = {
            point: {
                x: bodyLength,
                y: 1,
            },
            color: 'red',
            div: null,
        };
        this.snakebody.push(snakehead);
        for (let i = bodyLength - 1; i > 0; i--) {
            this.snakebody.push({
                point: {
                    x: i,
                    y: 1,
                },
                color: 'black',
                div: null,
            });
        }
        this.redirect = 'right';
    }

    public show() : void {
        for (let i = 0; i < this.snakebody.length; i++) {
            if (this.snakebody[i].div === null) {
                this.snakebody[i].div = document.createElement('div');
                this.snakebody[i].div.style.height = this.snakebody[i].div.style.width = size + 'px';
                this.snakebody[i].div.style.backgroundColor = this.snakebody[i].color;
                this.snakebody[i].div.style.position = 'absolute';
                document.body.appendChild(this.snakebody[i].div);
            }

            // set the point
            this.snakebody[i].div.style.left = setPoint(this.snakebody[i].point.x);
            this.snakebody[i].div.style.top = setPoint(this.snakebody[i].point.y);
        }
    }

    private addSection() : void {
        const newSection = {
            point: {
                x: this.snakebody[this.snakebody.length - 1].point.x,
                y: this.snakebody[this.snakebody.length - 1].point.y,
            },
            color: 'black',
            div: null,
        };
        this.snakebody.push(newSection);
    }

    public move() : any {
        for (let i = this.snakebody.length - 1; i > 0; i--) {
            this.snakebody[i].point.x = this.snakebody[i - 1].point.x;
            this.snakebody[i].point.y = this.snakebody[i - 1].point.y;
        }

        const snakehead = this.snakebody[0];

        switch (this.redirect) {
            case 'right':
                this.snakebody[0].point.x++;
                break;
            case 'left':
                this.snakebody[0].point.x--;
                break;
            case 'top':
                this.snakebody[0].point.y--;
                break;
            case 'down':
                this.snakebody[0].point.y++;
                break;
        }

        // snake head touches the food
        if (isSamePoint(snakehead.point, food.point)) {
            this.addSection();
            food.show();
        }
        // snake touches the map border
        if (snakehead.point.x > map.width / size ||
            snakehead.point.x < 0 ||
            snakehead.point.y > map.height / size ||
            snakehead.point.y < 0) {
            alert('Game over');
            clearInterval(mytime);
            return;
        }

        // snake head touches its own body
        console.dir(this.snakebody);
        for (let i = 1; i < this.snakebody.length - 1; i++) {
            if (isSamePoint(snakehead.point, this.snakebody[i].point)) {
                alert('kill you by yourself. Game over!');
                clearInterval(mytime);
                return;
            }
        }

        this.show();
    }
}

// window.onload = function () {
//     map.show();

//     food.show();

//     const snake = new Snake();
//     snake.show();

//     mytime = window.setInterval(() => {
//         snake.move();
//     },                          200);

//     document.onkeyup = function (evt) {
//         const num = evt.keyCode;
//         switch (num) {
//             case 37:
//                 snake.redirect = 'left';
//                 break;
//             case 38:
//                 snake.redirect = 'top';
//                 break;
//             case 39:
//                 snake.redirect = 'right';
//                 break;
//             case 40:
//                 snake.redirect = 'down';
//                 break;
//         }
//     };
// };

function setPoint(axis:number) : string {
    return axis * Spec.size + 'px';
}

function isSamePoint(point1:PointInterface, point2:PointInterface) : boolean {
    return point1.x === point2.x && point1.y === point2.y;
}
