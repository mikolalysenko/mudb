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

export class Player {
  private readonly speed = 0.5;
  private readonly r = 23; //radius of face
  private readonly lineWidth = this.r / 8;

  public x:number;
  public y:number;
  public color:string;
  public team:Team;

  constructor(x, y, color, team:Team) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.team = team;
  }

  public draw(ctx) {
    ctx.lineWidth = this.lineWidth;
    ctx.strokeStyle = this.color;
    ctx.fillStyle = this.color;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2, true); // face circle
    ctx.moveTo(this.x + this.r * 2 / 3, this.y);
    ctx.arc(this.x, this.y, this.r * 2 / 3, 0, Math.PI * 2, false); // mouth
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(this.x - (this.r / 3), this.y - (this.r / 3), this.r / 5, 0, Math.PI * 2, true); // left eye
    ctx.arc(this.x + (this.r / 3), this.y - (this.r / 3), this.r / 5, 0, Math.PI * 2, true); // right eye
    ctx.fill();
  }

  public move(direction, ctx) {
    const maxr = this.r + this.lineWidth;
    ctx.clearRect(this.x - maxr, this.y - maxr, 2 * maxr, 2 * maxr);
    switch (direction) {
      case Direction.up:
        this.y -= this.speed;
        break;
      case Direction.left:
        this.x -= this.speed;
        break;
      case Direction.right:
        this.x += this.speed;
        break;
      case Direction.down:
        this.y += this.speed;
        break;
      default:
        break;
    }
    this.draw(ctx);
  }
}

export class Flag {
  private readonly tall = 50;

  public color:string;
  public team:Team;
  public x:number;
  public y:number;

  constructor(x, y, color, team:Team) {
    this.x = x;
    this.y = y;
    this.color = color;
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

  constructor(width, height) {
    this.width = width;
    this.height = height;
  }

  public draw(ctx) {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.strokeStyle = 'white';
    ctx.beginPath();
    ctx.moveTo(0, this.height / 2);
    ctx.lineTo(this.width, this.height / 2);
    ctx.stroke();
  }
}
