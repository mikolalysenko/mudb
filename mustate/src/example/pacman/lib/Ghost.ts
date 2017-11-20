import * as game from './game.ts';

export class Ghost {
  public x;
  public y;
  public color;
  public dir;
  public isWeak;
  public radius;
  public isMoving;
  public isBlinking;
  public isDead;
  public speed;
  public stepCounter;

  constructor(xCord, yCord, gColor, direction) {
    this.x = xCord;
    this.y = yCord;
    this.color = gColor;
    this.dir = direction;
    this.isWeak = false;
    this.radius = GHOST_RADIUS;
    this.isMoving = false;
    this.isBlinking = false;
    this.isDead = false;
    this.speed = speed;
    this.stepCounter = 0;
  }

  public toGhostHouse() {
    let initX;
    let initY;
    switch (this.color) {
      case ORANGE:
        initX = ghostHouse[0][1] * GRID_WIDTH + GRID_WIDTH / 2;
        initY = ghostHouse[0][0] * GRID_WIDTH + GRID_WIDTH / 2;
        break;

      case CYAN:
        initX = ghostHouse[1][1] * GRID_WIDTH + GRID_WIDTH / 2;
        initY = ghostHouse[1][0] * GRID_WIDTH + GRID_WIDTH / 2;
        break;

      case PINK:
        initX = ghostHouse[2][1] * GRID_WIDTH + GRID_WIDTH / 2;
        initY = ghostHouse[2][0] * GRID_WIDTH + GRID_WIDTH / 2;
        break;

      case RED:
        initX = ghostHouse[3][1] * GRID_WIDTH + GRID_WIDTH / 2;
        initY = ghostHouse[3][0] * GRID_WIDTH + GRID_WIDTH / 2;
        break;

    }
    this.x = initX;
    this.y = initY;
    this.dir = DOWN;
    this.stepCounter = 0;
  }

  public draw(ctx) {
    if (!this.isDead) {
      // body color
      if (this.isWeak) {
        if (this.isBlinking) {
          ctx.fillStyle = BLINKING_COLOR;
        } else {
          ctx.fillStyle = WEAK_COLOR;
        }
      } else {
        ctx.fillStyle = this.color;
      }

      ctx.beginPath();

      ctx.arc(this.x, this.y, this.radius, Math.PI, 0, false);
      ctx.moveTo(this.x - this.radius, this.y);

      // LEGS
      if (!this.isMoving) {
        ctx.lineTo(this.x - this.radius, this.y + this.radius);
        ctx.lineTo(this.x - this.radius + this.radius / 3, this.y + this.radius - this.radius / 4);
        ctx.lineTo(this.x - this.radius + this.radius / 3 * 2, this.y + this.radius);
        ctx.lineTo(this.x, this.y + this.radius - this.radius / 4);
        ctx.lineTo(this.x + this.radius / 3, this.y + this.radius);
        ctx.lineTo(this.x + this.radius / 3 * 2, this.y + this.radius - this.radius / 4);

        ctx.lineTo(this.x + this.radius, this.y + this.radius);
        ctx.lineTo(this.x + this.radius, this.y);
      } else {
        ctx.lineTo(this.x - this.radius, this.y + this.radius - this.radius / 4);
        ctx.lineTo(this.x - this.radius + this.radius / 3, this.y + this.radius);
        ctx.lineTo(this.x - this.radius + this.radius / 3 * 2, this.y + this.radius - this.radius / 4);
        ctx.lineTo(this.x, this.y + this.radius);
        ctx.lineTo(this.x + this.radius / 3, this.y + this.radius - this.radius / 4);
        ctx.lineTo(this.x + this.radius / 3 * 2, this.y + this.radius);
        ctx.lineTo(this.x + this.radius, this.y + this.radius - this.radius / 4);
        ctx.lineTo(this.x + this.radius, this.y);
      }

      ctx.fill();
    }

    if (this.isWeak) {

      if (this.isBlinking) {
        ctx.fillStyle = '#f00';
        ctx.strokeStyle = 'f00';
      } else {
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'white';
      }

      //eyes
      ctx.beginPath(); //left eye
      ctx.arc(this.x - this.radius / 2.5, this.y - this.radius / 5, this.radius / 5, 0, Math.PI * 2, true); // white
      ctx.fill();

      ctx.beginPath(); // right eye
      ctx.arc(this.x + this.radius / 2.5, this.y - this.radius / 5, this.radius / 5, 0, Math.PI * 2, true); // white
      ctx.fill();

      //mouth
      ctx.beginPath();
      ctx.lineWidth = 1;
      ctx.moveTo(this.x - this.radius + this.radius / 5, this.y + this.radius / 2);
      ctx.lineTo(this.x - this.radius + this.radius / 3, this.y + this.radius / 4);
      ctx.lineTo(this.x - this.radius + this.radius / 3 * 2, this.y + this.radius / 2);
      ctx.lineTo(this.x, this.y + this.radius / 4);
      ctx.lineTo(this.x + this.radius / 3, this.y + this.radius / 2);
      ctx.lineTo(this.x + this.radius / 3 * 2, this.y + this.radius / 4);
      ctx.lineTo(this.x + this.radius - this.radius / 5, this.y + this.radius / 2);
      ctx.stroke();
    } else {
      // EYES
      ctx.fillStyle = 'white'; //left eye
      ctx.beginPath();
      ctx.arc(this.x - this.radius / 2.5, this.y - this.radius / 5, this.radius / 3, 0, Math.PI * 2, true); // white
      ctx.fill();

      ctx.fillStyle = 'white'; //right eye
      ctx.beginPath();
      ctx.arc(this.x + this.radius / 2.5, this.y - this.radius / 5, this.radius / 3, 0, Math.PI * 2, true); // white
      ctx.fill();

      switch (this.dir) {

        case UP:
          ctx.fillStyle = 'black'; //left eyeball
          ctx.beginPath();
          ctx.arc(this.x - this.radius / 3, this.y - this.radius / 5 - this.radius / 6, this.radius / 6, 0, Math.PI * 2, true); //black
          ctx.fill();

          ctx.fillStyle = 'black'; //right eyeball
          ctx.beginPath();
          ctx.arc(this.x + this.radius / 3, this.y - this.radius / 5 - this.radius / 6, this.radius / 6, 0, Math.PI * 2, true); //black
          ctx.fill();
          break;

        case DOWN:
          ctx.fillStyle = 'black'; //left eyeball
          ctx.beginPath();
          ctx.arc(this.x - this.radius / 3, this.y - this.radius / 5 + this.radius / 6, this.radius / 6, 0, Math.PI * 2, true); //black
          ctx.fill();

          ctx.fillStyle = 'black'; //right eyeball
          ctx.beginPath();
          ctx.arc(this.x + this.radius / 3, this.y - this.radius / 5 + this.radius / 6, this.radius / 6, 0, Math.PI * 2, true); //black
          ctx.fill();
          break;

        case LEFT:
          ctx.fillStyle = 'black'; //left eyeball
          ctx.beginPath();
          ctx.arc(this.x - this.radius / 3 - this.radius / 5, this.y - this.radius / 5, this.radius / 6, 0, Math.PI * 2, true); //black
          ctx.fill();

          ctx.fillStyle = 'black'; //right eyeball
          ctx.beginPath();
          ctx.arc(this.x + this.radius / 3 - this.radius / 15, this.y - this.radius / 5, this.radius / 6, 0, Math.PI * 2, true); //black
          ctx.fill();
          break;

        case RIGHT:
          ctx.fillStyle = 'black'; //left eyeball
          ctx.beginPath();
          ctx.arc(this.x - this.radius / 3 + this.radius / 15, this.y - this.radius / 5, this.radius / 6, 0, Math.PI * 2, true); //black
          ctx.fill();

          ctx.fillStyle = 'black'; //right eyeball
          ctx.beginPath();
          ctx.arc(this.x + this.radius / 3 + this.radius / 5, this.y - this.radius / 5, this.radius / 6, 0, Math.PI * 2, true); //black
          ctx.fill();
          break;
      }
    }
  }

  public getRow() {
    return game.getRowIndex(this.y);
  }

  public getCol() {
    return game.getColIndex(this.x);
  }

  public moveOneStep() {
    let newX:number = 0;
    let newY:number = 0;
    if (!game.canMove(this.x, this.y, this.dir)) {
        return;
    }

    switch (this.dir) {
      case game.UP:
        newY = this.y  - this.speed;
        if (newY - this.radius - game.WALL_WIDTH > 0) {
            this.y = newY;
        }
        break;

      case game.DOWN:
        newY = this.y + this.speed;
        if (newY + this.radius + game.WALL_WIDTH < game.CANVAS_HEIGHT) {
            this.y = newY;

        }
        break;

      case game.LEFT:
        newX = this.x - this.speed;
        if (newX - this.radius - game.WALL_WIDTH > 0 ) {
            this.x = newX;
        }
        break;

      case game.RIGHT:
        newX = this.x + this.speed;
        if (newX + this.radius + game.WALL_WIDTH < game.CANVAS_WIDTH) {
            this.x = newX;
        }
        break;

      default:
        break;
    }
  }
}
