export enum Direction {
  left = 37,
  up,
  right,
  down,
}

export enum Team {
  top,
  bottom,
}

export const Config = {
  canvas_width: 700,
  canvas_height: 500,
  player_size: 10,
  flag_size: 15,
};

export class Player {
  private readonly speed = 3;
  private readonly r = Config.player_size; //radius of face
  private readonly lineWidth = this.r / 8;

  public x:number;
  public y:number;
  public color:string;
  public team:Team;
  public direction:number|undefined;

  constructor(x, y, team) {
    this.x = x;
    this.y = y;
    this.team = team;
    this.color = (team === Team.top) ? 'yellow' : '#00ffde';
  }

  public draw(ctx) {
    ctx.lineWidth = this.lineWidth;
    ctx.strokeStyle = this.color;
    ctx.fillStyle = this.color;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2, true); // face circle
    ctx.moveTo(this.x + this.r * 2 / 3, this.y);
    ctx.arc(this.x, this.y, this.r * 2 / 3, 0, Math.PI, false); // mouth
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(this.x - (this.r / 3), this.y - (this.r / 3), this.r / 5, 0, Math.PI * 2, true); // left eye
    ctx.arc(this.x + (this.r / 3), this.y - (this.r / 3), this.r / 5, 0, Math.PI * 2, true); // right eye
    ctx.fill();
  }

  public move(ctx) {
    switch (this.direction) {
      case Direction.up:
        this.y -= this.speed;
        if (this.y < this.r) { this.y = this.r; }
        break;
      case Direction.left:
        this.x -= this.speed;
        if (this.x < this.r) { this.x = this.r; }
        break;
      case Direction.right:
        this.x += this.speed;
        if (this.x > Config.canvas_width - this.r) { this.x = Config.canvas_width - this.r; }
        break;
      case Direction.down:
        this.y += this.speed;
        if (this.y > Config.canvas_height - this.r) { this.y = Config.canvas_height - this.r; }
        break;
      default:
        break;
    }
    this.draw(ctx);
  }
}

export class Flag {
  private readonly tall = Config.flag_size;

  public color:string;
  public team:Team;
  public x:number;
  public y:number;

  constructor(x, y, team:Team) {
    this.x = x;
    this.y = y;
    this.color = (team === Team.top) ? 'yellow' : '#00ffde';
    this.team = team;
  }

  public draw(ctx) {
    ctx.strokeStyle = this.color;
    ctx.fillStyle = this.color;
    ctx.lineWidth = 5;

    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x, this.y - this.tall);
    ctx.stroke();
    ctx.lineTo(this.x + this.tall / 2, this.y - this.tall * 2 / 3);
    ctx.lineTo(this.x, this.y - this.tall * 1 / 3);
    ctx.fill();
  }
}

export class Map {
  public width:number;
  public height:number;
  public score:number[];

  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.score = [0, 0];
  }

  public draw(ctx) {
    ctx.strokeStyle = 'red';
    ctx.beginPath();
    ctx.moveTo(0, this.height / 2);
    ctx.lineTo(this.width, this.height / 2);
    ctx.stroke();
    ctx.closePath();

    // show score
    ctx.font = '48px serif';
    ctx.fillStyle = 'white';
    ctx.fillText(this.score[0].toString(), Config.canvas_width - 40, 35);
    ctx.fillText(this.score[1].toString(), Config.canvas_width - 40, Config.canvas_height - 5);
  }
}
