/*======================GLOBAL lets====================*/
let welcomePacman;
let welcomeBlinky;
let welcomeInky;

export const GLOBAL = {};
// directions
GLOBAL['up'] = 1;
GLOBAL['down'] = 2;
GLOBAL['left'] = 3;
GLOBAL['right'] = 4;

export const CANVAS_WIDTH = 510;
export const CANVAS_HEIGHT = 510;

// game grid
GLOBAL['GRID_WIDTH'] = 30;
GLOBAL['GRID_HEIGHT'] = 30;
GLOBAL['WALL_WIDTH'] = 3;
GLOBAL['numRows'] = CANVAS_WIDTH / GLOBAL['GRID_HEIGHT'];
GLOBAL['numCols'] = CANVAS_HEIGHT / GLOBAL['GRID_WIDTH'];

// colors for UI & Pacman
GLOBAL['BG_COLOR'] = 'black';
GLOBAL['BORDER_COLOR'] = 'blue';
GLOBAL['BEAN_COLOR'] = 'white';
GLOBAL['PACMAN_COLOR'] = 'yellow';

// colors for ghost
GLOBAL['red'] = 'red';
GLOBAL['pink'] = '#ff9cce';
GLOBAL['cyan'] = '#00ffde';
GLOBAL['orange'] = '#ffb847';
GLOBAL['weak_color'] = '#0031ff';
GLOBAL['blinking_color'] = 'white';

// size of sprites
GLOBAL['NORMAL_BEAN_RADIUS'] = 2;
GLOBAL['POWER_BEAN_RADIUS'] = 5;
GLOBAL['PACMAN_RADIUS'] = 9;
GLOBAL['GHOST_RADIUS'] = 9;

// game parameters
GLOBAL['restartTimer'] = 0;
GLOBAL['timerDelay'] = 80;
GLOBAL['speed'] = 5;
GLOBAL['score'] = 0;
GLOBAL['lives'] = [];
GLOBAL['MAX_LIFE'] = 3;
GLOBAL['life'] = GLOBAL['MAX_LIFE'];
GLOBAL['weakBonus'] = 200;
GLOBAL['MAX_BEANS'] = 136;
GLOBAL['beansLeft'] = GLOBAL['MAX_BEANS'];
GLOBAL['WEAK_DURATION'] = 10000 / GLOBAL['timerDelay'];

//bean cases
GLOBAL['NORMAL_BEAN'] = 1;
GLOBAL['POWER_BEAN'] = 2;

//grid
GLOBAL['grid_id'] = -1;

//wall cases
GLOBAL['CROSS_RD'] = -1; //no wall
GLOBAL['LEFT_ONLY'] = 0;
GLOBAL['TOP_ONLY'] = 1;
GLOBAL['RIGHT_ONLY'] = 2;
GLOBAL['BOTTOM_ONLY'] = 3;

GLOBAL['LEFT_RIGHT'] = 4;
GLOBAL['LEFT_TOP'] = 5;
GLOBAL['LEFT_BOTTOM'] = 6;

GLOBAL['RIGHT_TOP'] = 7;
GLOBAL['RIGHT_BOTTOM'] = 8;
GLOBAL['TOP_BOTTOM'] = 9;

GLOBAL['BOTTOM_LEFT_TOP'] = 10;
GLOBAL['LEFT_TOP_RIGHT'] = 11;
GLOBAL['TOP_RIGHT_BOTTOM'] = 12;
GLOBAL['RIGHT_BOTTOM_LEFT'] = 13;

GLOBAL['EMPTY_GRID'] = 14;
GLOBAL['CLOSED_GRID'] = 15;

//game state and map
GLOBAL['gameOn'] = false;
GLOBAL['gamePaused'] = false;
export const maze = new Array(CANVAS_HEIGHT / GLOBAL['GRID_HEIGHT']);
export const mazeContent = [
  //row1
  [GLOBAL['LEFT_TOP'], GLOBAL['TOP_BOTTOM'], GLOBAL['TOP_BOTTOM'], GLOBAL['TOP_ONLY'], GLOBAL['TOP_BOTTOM'],
    GLOBAL['TOP_BOTTOM'], GLOBAL['TOP_BOTTOM'], GLOBAL['RIGHT_TOP'], GLOBAL['LEFT_TOP'], GLOBAL['TOP_ONLY'],
    GLOBAL['TOP_ONLY'], GLOBAL['TOP_ONLY'], GLOBAL['TOP_ONLY'], GLOBAL['TOP_ONLY'], GLOBAL['TOP_ONLY'],
    GLOBAL['TOP_ONLY'], GLOBAL['RIGHT_TOP'],
  ],
  //row2
  [GLOBAL['LEFT_RIGHT'], GLOBAL['BOTTOM_LEFT_TOP'], GLOBAL['RIGHT_TOP'], GLOBAL['LEFT_RIGHT'], GLOBAL['LEFT_TOP'],
    GLOBAL['TOP_BOTTOM'], GLOBAL['TOP_RIGHT_BOTTOM'], GLOBAL['LEFT_RIGHT'], GLOBAL['LEFT_BOTTOM'], GLOBAL['BOTTOM_ONLY'],
    GLOBAL['BOTTOM_ONLY'], GLOBAL['BOTTOM_ONLY'], GLOBAL['BOTTOM_ONLY'], GLOBAL['BOTTOM_ONLY'], GLOBAL['EMPTY_GRID'],
    GLOBAL['EMPTY_GRID'], GLOBAL['RIGHT_ONLY'],
  ],
  //row3
  [GLOBAL['LEFT_BOTTOM'], GLOBAL['RIGHT_TOP'], GLOBAL['LEFT_RIGHT'], GLOBAL['LEFT_RIGHT'], GLOBAL['LEFT_RIGHT'],
    GLOBAL['BOTTOM_LEFT_TOP'], GLOBAL['TOP_BOTTOM'], GLOBAL['EMPTY_GRID'], GLOBAL['TOP_BOTTOM'], GLOBAL['TOP_BOTTOM'],
    GLOBAL['TOP_BOTTOM'], GLOBAL['TOP_BOTTOM'], GLOBAL['TOP_BOTTOM'], GLOBAL['RIGHT_TOP'], GLOBAL['LEFT_ONLY'],
    GLOBAL['EMPTY_GRID'], GLOBAL['RIGHT_ONLY'],
  ],
  //row4
  [GLOBAL['CLOSED_GRID'], GLOBAL['LEFT_RIGHT'], GLOBAL['LEFT_RIGHT'], GLOBAL['LEFT_RIGHT'], GLOBAL['LEFT_BOTTOM'],
    GLOBAL['TOP_BOTTOM'], GLOBAL['RIGHT_TOP'], GLOBAL['LEFT_RIGHT'], GLOBAL['BOTTOM_LEFT_TOP'], GLOBAL['TOP_BOTTOM'],
    GLOBAL['TOP_BOTTOM'], GLOBAL['TOP_BOTTOM'], GLOBAL['TOP_RIGHT_BOTTOM'], GLOBAL['LEFT_RIGHT'], GLOBAL['LEFT_ONLY'],
    GLOBAL['EMPTY_GRID'], GLOBAL['RIGHT_ONLY'],
  ],
  //row5
  [GLOBAL['LEFT_TOP'], GLOBAL['RIGHT_BOTTOM'], GLOBAL['LEFT_RIGHT'], GLOBAL['LEFT_BOTTOM'], GLOBAL['TOP_ONLY'],
    GLOBAL['TOP_RIGHT_BOTTOM'], GLOBAL['LEFT_RIGHT'], GLOBAL['LEFT_ONLY'], GLOBAL['TOP_BOTTOM'], GLOBAL['TOP_BOTTOM'],
    GLOBAL['TOP_BOTTOM'], GLOBAL['TOP_ONLY'], GLOBAL['TOP_BOTTOM'], GLOBAL['RIGHT_BOTTOM'], GLOBAL['LEFT_ONLY'],
    GLOBAL['EMPTY_GRID'], GLOBAL['RIGHT_ONLY'],
  ],
  //row6
  [GLOBAL['LEFT_RIGHT'], GLOBAL['BOTTOM_LEFT_TOP'], GLOBAL['BOTTOM_ONLY'], GLOBAL['TOP_RIGHT_BOTTOM'], GLOBAL['LEFT_RIGHT'],
    GLOBAL['BOTTOM_LEFT_TOP'], GLOBAL['RIGHT_BOTTOM'], GLOBAL['LEFT_RIGHT'], GLOBAL['LEFT_TOP'], GLOBAL['TOP_BOTTOM'],
    GLOBAL['RIGHT_TOP'], GLOBAL['LEFT_RIGHT'], GLOBAL['BOTTOM_LEFT_TOP'], GLOBAL['TOP_BOTTOM'], GLOBAL['BOTTOM_ONLY'],
    GLOBAL['BOTTOM_ONLY'], GLOBAL['RIGHT_BOTTOM'],
  ],
  //row7
  [GLOBAL['LEFT_ONLY'], GLOBAL['TOP_BOTTOM'], GLOBAL['TOP_BOTTOM'], GLOBAL['TOP_BOTTOM'], GLOBAL['BOTTOM_ONLY'],
    GLOBAL['TOP_BOTTOM'], GLOBAL['TOP_BOTTOM'], GLOBAL['RIGHT_ONLY'], GLOBAL['LEFT_RIGHT'], GLOBAL['LEFT_TOP_RIGHT'],
    GLOBAL['LEFT_RIGHT'], GLOBAL['LEFT_ONLY'], GLOBAL['TOP_BOTTOM'], GLOBAL['TOP_BOTTOM'], GLOBAL['TOP_BOTTOM'],
    GLOBAL['TOP_BOTTOM'], GLOBAL['RIGHT_TOP'],
  ],
  //row8
  [GLOBAL['LEFT_RIGHT'], GLOBAL['BOTTOM_LEFT_TOP'], GLOBAL['TOP_BOTTOM'], GLOBAL['TOP_BOTTOM'], GLOBAL['TOP_BOTTOM'],
    GLOBAL['TOP_BOTTOM'], GLOBAL['TOP_RIGHT_BOTTOM'], GLOBAL['LEFT_RIGHT'], GLOBAL['LEFT_RIGHT'], GLOBAL['LEFT_RIGHT'],
    GLOBAL['LEFT_RIGHT'], GLOBAL['LEFT_RIGHT'], GLOBAL['BOTTOM_LEFT_TOP'], GLOBAL['TOP_BOTTOM'], GLOBAL['TOP_BOTTOM'],
    GLOBAL['TOP_RIGHT_BOTTOM'], GLOBAL['LEFT_RIGHT'],
  ],
  //row9
  [GLOBAL['LEFT_BOTTOM'], GLOBAL['TOP_BOTTOM'], GLOBAL['TOP_BOTTOM'], GLOBAL['TOP_BOTTOM'], GLOBAL['TOP_ONLY'],
    GLOBAL['TOP_BOTTOM'], GLOBAL['TOP_BOTTOM'], GLOBAL['RIGHT_ONLY'], GLOBAL['LEFT_RIGHT'], GLOBAL['LEFT_RIGHT'],
    GLOBAL['LEFT_RIGHT'], GLOBAL['LEFT_ONLY'], GLOBAL['TOP_BOTTOM'], GLOBAL['TOP_BOTTOM'], GLOBAL['TOP_BOTTOM'],
    GLOBAL['TOP_BOTTOM'], GLOBAL['RIGHT_ONLY'],
  ],
  //row10
  [GLOBAL['LEFT_TOP'], GLOBAL['TOP_ONLY'], GLOBAL['TOP_ONLY'], GLOBAL['RIGHT_TOP'], GLOBAL['LEFT_RIGHT'],
    GLOBAL['BOTTOM_LEFT_TOP'], GLOBAL['TOP_RIGHT_BOTTOM'], GLOBAL['LEFT_RIGHT'], GLOBAL['RIGHT_BOTTOM_LEFT'], GLOBAL['LEFT_RIGHT'],
    GLOBAL['RIGHT_BOTTOM_LEFT'], GLOBAL['LEFT_RIGHT'], GLOBAL['BOTTOM_LEFT_TOP'], GLOBAL['TOP_BOTTOM'], GLOBAL['TOP_BOTTOM'],
    GLOBAL['TOP_RIGHT_BOTTOM'], GLOBAL['LEFT_RIGHT'],
  ],
  //row11
  [GLOBAL['LEFT_ONLY'], GLOBAL['EMPTY_GRID'], GLOBAL['EMPTY_GRID'], GLOBAL['RIGHT_ONLY'], GLOBAL['LEFT_ONLY'],
    GLOBAL['TOP_BOTTOM'], GLOBAL['TOP_BOTTOM'], GLOBAL['BOTTOM_ONLY'], GLOBAL['TOP_ONLY'], GLOBAL['BOTTOM_ONLY'],
    GLOBAL['TOP_BOTTOM'], GLOBAL['BOTTOM_ONLY'], GLOBAL['TOP_ONLY'], GLOBAL['TOP_BOTTOM'], GLOBAL['TOP_BOTTOM'],
    GLOBAL['TOP_BOTTOM'], GLOBAL['RIGHT_ONLY'],
  ],
  //row12
  [GLOBAL['LEFT_ONLY'], GLOBAL['EMPTY_GRID'], GLOBAL['EMPTY_GRID'], GLOBAL['RIGHT_ONLY'], GLOBAL['LEFT_RIGHT'],
    GLOBAL['BOTTOM_LEFT_TOP'], GLOBAL['TOP_BOTTOM'], GLOBAL['RIGHT_TOP'], GLOBAL['LEFT_RIGHT'], GLOBAL['BOTTOM_LEFT_TOP'],
    GLOBAL['TOP_BOTTOM'], GLOBAL['RIGHT_TOP'], GLOBAL['LEFT_RIGHT'], GLOBAL['BOTTOM_LEFT_TOP'], GLOBAL['TOP_BOTTOM'],
    GLOBAL['RIGHT_TOP'], GLOBAL['LEFT_RIGHT'],
  ],
  //row13
  [GLOBAL['LEFT_ONLY'], GLOBAL['EMPTY_GRID'], GLOBAL['EMPTY_GRID'], GLOBAL['RIGHT_ONLY'], GLOBAL['LEFT_ONLY'],
    GLOBAL['TOP_BOTTOM'], GLOBAL['TOP_RIGHT_BOTTOM'], GLOBAL['LEFT_RIGHT'], GLOBAL['LEFT_ONLY'], GLOBAL['TOP_BOTTOM'],
    GLOBAL['TOP_RIGHT_BOTTOM'], GLOBAL['LEFT_RIGHT'], GLOBAL['LEFT_ONLY'], GLOBAL['TOP_BOTTOM'], GLOBAL['RIGHT_TOP'],
    GLOBAL['LEFT_RIGHT'], GLOBAL['LEFT_RIGHT'],
  ],
  //row14
  [GLOBAL['LEFT_ONLY'], GLOBAL['EMPTY_GRID'], GLOBAL['EMPTY_GRID'], GLOBAL['RIGHT_ONLY'], GLOBAL['LEFT_RIGHT'],
    GLOBAL['LEFT_TOP'], GLOBAL['TOP_BOTTOM'], GLOBAL['RIGHT_BOTTOM'], GLOBAL['LEFT_RIGHT'], GLOBAL['BOTTOM_LEFT_TOP'],
    GLOBAL['TOP_BOTTOM'], GLOBAL['RIGHT_ONLY'], GLOBAL['LEFT_RIGHT'], GLOBAL['LEFT_TOP_RIGHT'], GLOBAL['LEFT_RIGHT'],
    GLOBAL['LEFT_RIGHT'], GLOBAL['LEFT_RIGHT'],
  ],
  //row15
  [GLOBAL['LEFT_ONLY'], GLOBAL['EMPTY_GRID'], GLOBAL['EMPTY_GRID'], GLOBAL['RIGHT_ONLY'], GLOBAL['LEFT_RIGHT'],
    GLOBAL['LEFT_RIGHT'], GLOBAL['BOTTOM_LEFT_TOP'], GLOBAL['TOP_BOTTOM'], GLOBAL['EMPTY_GRID'], GLOBAL['TOP_BOTTOM'],
    GLOBAL['TOP_RIGHT_BOTTOM'], GLOBAL['LEFT_RIGHT'], GLOBAL['LEFT_RIGHT'], GLOBAL['LEFT_RIGHT'], GLOBAL['LEFT_RIGHT'],
    GLOBAL['LEFT_RIGHT'], GLOBAL['LEFT_RIGHT'],
  ],
  //row16
  [GLOBAL['LEFT_ONLY'], GLOBAL['EMPTY_GRID'], GLOBAL['EMPTY_GRID'], GLOBAL['RIGHT_ONLY'], GLOBAL['LEFT_RIGHT'],
    GLOBAL['LEFT_BOTTOM'], GLOBAL['TOP_BOTTOM'], GLOBAL['TOP_RIGHT_BOTTOM'], GLOBAL['LEFT_RIGHT'], GLOBAL['BOTTOM_LEFT_TOP'],
    GLOBAL['TOP_BOTTOM'], GLOBAL['RIGHT_BOTTOM'], GLOBAL['LEFT_RIGHT'], GLOBAL['LEFT_RIGHT'], GLOBAL['LEFT_RIGHT'],
    GLOBAL['RIGHT_BOTTOM_LEFT'], GLOBAL['LEFT_RIGHT'],
  ],
  //row17
  [GLOBAL['LEFT_BOTTOM'], GLOBAL['BOTTOM_ONLY'], GLOBAL['BOTTOM_ONLY'], GLOBAL['RIGHT_BOTTOM'], GLOBAL['LEFT_BOTTOM'],
    GLOBAL['TOP_BOTTOM'], GLOBAL['TOP_BOTTOM'], GLOBAL['TOP_BOTTOM'], GLOBAL['BOTTOM_ONLY'], GLOBAL['TOP_BOTTOM'],
    GLOBAL['TOP_BOTTOM'], GLOBAL['TOP_BOTTOM'], GLOBAL['RIGHT_BOTTOM'], GLOBAL['RIGHT_BOTTOM_LEFT'], GLOBAL['LEFT_BOTTOM'],
    GLOBAL['TOP_BOTTOM'], GLOBAL['RIGHT_BOTTOM'],
  ],
];

// grids that don't redraw
GLOBAL['staticGrids'] = [];
GLOBAL['staticGridsIndex'] = 0;

// start location of pacman
GLOBAL['pacmanStartLoc'] = [4, 9];

// grids with no beans
GLOBAL['noBean'] = [GLOBAL['pacmanStartLoc'], [5, 12],
  [5, 13],
  [5, 3],
  [9, 5],
  [9, 6],
  [1, 1],
  [5, 1],
  [3, 0],
  [2, 4],
  [4, 6],
  [5, 6],
  [5, 5],
  [12, 7],
  [14, 5],
  [12, 11],
  [14, 11],
];
GLOBAL['noBeanIndex'] = GLOBAL['noBean'].length;

// power beans in maze
GLOBAL['powerBeans'] = [
  [0, 0],
  [2, 13],
  [16, 4],
  [16, 16],
  [2, 5],
  [14, 10],
];

// ghost house
GLOBAL['powerBeans'] = [];
GLOBAL['ghostHouseIndex'] = 0;

/*======================Pacman====================*/
export class Pacman {
  public x:number;
  public y:number;
  public dir:number;
  public nextDir:number|undefined;
  public radius:number;
  public mouthOpen:boolean;
  public color:string;

  constructor(xCord, yCord, color='yellow', direction, mouthOpen=true) {
    this.x = xCord;
    this.y = yCord;
    this.dir = direction;
    this.nextDir = undefined; //the direction to turn at next available turning point
    this.radius = 9;
    this.mouthOpen = mouthOpen;
    this.color = color;
  }

  public draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.beginPath();

    if (!this.mouthOpen) {
      switch (this.dir) {
        case GLOBAL['up']:
          ctx.arc(this.x, this.y, this.radius, 2 * Math.PI - Math.PI * 11 / 18, 2 * Math.PI - Math.PI * 7 / 18, true);
          break;

        case GLOBAL['down']:
          ctx.arc(this.x, this.y, this.radius, 2 * Math.PI - Math.PI * 29 / 18, 2 * Math.PI - Math.PI * 25 / 18, true);
          break;

        case GLOBAL['left']:
          ctx.arc(this.x, this.y, this.radius, 2 * Math.PI - Math.PI * 10 / 9, 2 * Math.PI - Math.PI * 8 / 9, true);
          break;

        case GLOBAL['right']:
          ctx.arc(this.x, this.y, this.radius, 2 * Math.PI - Math.PI / 9, 2 * Math.PI - Math.PI * 17 / 9, true);
          break;

        default:
          break;
      }
    } else {
      switch (this.dir) {
        case GLOBAL['up']:
          ctx.arc(this.x, this.y, this.radius, 2 * Math.PI - Math.PI * 7 / 9, 2 * Math.PI - Math.PI * 2 / 9, true);
          break;

        case GLOBAL['down']:
          ctx.arc(this.x, this.y, this.radius, 2 * Math.PI - Math.PI * 16 / 9, 2 * Math.PI - Math.PI * 11 / 9, true);
          break;

        case GLOBAL['left']:
          ctx.arc(this.x, this.y, this.radius, 2 * Math.PI - Math.PI * 23 / 18, 2 * Math.PI - Math.PI * 13 / 18, true);
          break;

        case GLOBAL['right']:
          ctx.arc(this.x, this.y, this.radius, 2 * Math.PI - Math.PI * 5 / 18, 2 * Math.PI - Math.PI * 31 / 18, true);
          break;

        default:
          break;

      }
    }
    ctx.lineTo(this.x, this.y);
    ctx.fill();
  }

  public getRow() {
    return getRowIndex(this.y);
  }

  public getCol() {
    return getColIndex(this.x);
  }

  public canMove(dir) {
    return canMove(this.x, this.y, dir);
  }

  public move() {
    if (onGridCenter(this.x, this.y) === false) {
      //not on a grid center
      if (this.nextDir != undefined && (
          (this.dir === GLOBAL['up'] && this.nextDir === GLOBAL['down']) ||
          (this.dir === GLOBAL['down'] && this.nextDir === GLOBAL['up']) ||
          (this.dir === GLOBAL['left'] && this.nextDir === GLOBAL['right']) ||
          (this.dir === GLOBAL['right'] && this.nextDir === GLOBAL['left'])
        )) {
        this.dir = this.nextDir;
        this.nextDir = undefined;
      }

      this.moveOneStep();

      return;
    } else {
      //on grid center. change direction if needed

      if (this.nextDir != undefined && this.canMove(this.nextDir)) {
        this.dir = this.nextDir;
        this.nextDir = undefined;
        this.moveOneStep();
      } else {
        //check if pacman can keep moving
        if (this.canMove(this.dir)) {
          this.moveOneStep();
        }
      }
    }
  }

  public moveOneStep() {
    let newX = 0;
    let newY = 0;
    if (!canMove(this.x, this.y, this.dir)) {
      return;
    }
    switch (this.dir) {

      case GLOBAL['up']:
        newY = this.y - GLOBAL['speed'];
        if (newY - this.radius - GLOBAL['WALL_WIDTH'] > 0) {
          this.y = newY;
          this.mouthOpen = !this.mouthOpen;
        }
        break;

      case GLOBAL['down']:
        newY = this.y + GLOBAL['speed'];
        if (newY + this.radius + GLOBAL['WALL_WIDTH'] < CANVAS_HEIGHT) {
          this.y = newY;
          this.mouthOpen = !this.mouthOpen;

        }
        break;

      case GLOBAL['left']:
        newX = this.x - GLOBAL['speed'];
        if (newX - this.radius - GLOBAL['WALL_WIDTH'] > 0) {
          this.x = newX;
          this.mouthOpen = !this.mouthOpen;
        }
        break;

      case GLOBAL['right']:
        newX = this.x + GLOBAL['speed'];

        if (newX + this.radius + GLOBAL['WALL_WIDTH'] < CANVAS_WIDTH) {
          this.x = newX;
          this.mouthOpen = !this.mouthOpen;
        }
        break;

      default:
        break;
    }
  }
}

/*=================Ghost================*/
export class Ghost {
  public x:number;
  public y:number;
  public color:string;
  public dir:number;
  public isWeak:boolean;
  public radius:number;
  public isMoving:boolean;
  public isBlinking:boolean;
  public isDead:boolean;
  public speed:number;
  public stepCounter:number;

  constructor(xCord, yCord, gColor, direction, isWeak=false, isBlinking=false, isDead=false) {
    this.x = xCord;
    this.y = yCord;
    this.color = gColor;
    this.dir = direction;
    this.isWeak = isWeak;
    this.radius = GLOBAL['GHOST_RADIUS'];
    this.isMoving = false;
    this.isBlinking = isBlinking;
    this.isDead = isDead;
    this.speed = GLOBAL['speed'];
    this.stepCounter = 0;
  }

  public toGhostHouse() {
    let initX;
    let initY;
    switch (this.color) {
      case GLOBAL['orange']:
        initX = GLOBAL['powerBeans'][0][1] * GLOBAL['GRID_WIDTH'] + GLOBAL['GRID_WIDTH'] / 2;
        initY = GLOBAL['powerBeans'][0][0] * GLOBAL['GRID_WIDTH'] + GLOBAL['GRID_WIDTH'] / 2;
        break;

      case GLOBAL['cyan']:
        initX = GLOBAL['powerBeans'][1][1] * GLOBAL['GRID_WIDTH'] + GLOBAL['GRID_WIDTH'] / 2;
        initY = GLOBAL['powerBeans'][1][0] * GLOBAL['GRID_WIDTH'] + GLOBAL['GRID_WIDTH'] / 2;
        break;

      case GLOBAL['pink']:
        initX = GLOBAL['powerBeans'][2][1] * GLOBAL['GRID_WIDTH'] + GLOBAL['GRID_WIDTH'] / 2;
        initY = GLOBAL['powerBeans'][2][0] * GLOBAL['GRID_WIDTH'] + GLOBAL['GRID_WIDTH'] / 2;
        break;

      case GLOBAL['red']:
        initX = GLOBAL['powerBeans'][3][1] * GLOBAL['GRID_WIDTH'] + GLOBAL['GRID_WIDTH'] / 2;
        initY = GLOBAL['powerBeans'][3][0] * GLOBAL['GRID_WIDTH'] + GLOBAL['GRID_WIDTH'] / 2;
        break;
    }
    this.x = initX;
    this.y = initY;
    this.dir = GLOBAL['down'];
    this.stepCounter = 0;
  }

  public draw(ctx) {
    if (!this.isDead) {
      // body color
      if (this.isWeak) {
        if (this.isBlinking) {
          ctx.fillStyle = GLOBAL['blinking_color'];
        } else {
          ctx.fillStyle = GLOBAL['weak_color'];
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

        case GLOBAL['up']:
          ctx.fillStyle = 'black'; //left eyeball
          ctx.beginPath();
          ctx.arc(this.x - this.radius / 3, this.y - this.radius / 5 - this.radius / 6, this.radius / 6, 0, Math.PI * 2, true); //black
          ctx.fill();

          ctx.fillStyle = 'black'; //right eyeball
          ctx.beginPath();
          ctx.arc(this.x + this.radius / 3, this.y - this.radius / 5 - this.radius / 6, this.radius / 6, 0, Math.PI * 2, true); //black
          ctx.fill();
          break;

        case GLOBAL['down']:
          ctx.fillStyle = 'black'; //left eyeball
          ctx.beginPath();
          ctx.arc(this.x - this.radius / 3, this.y - this.radius / 5 + this.radius / 6, this.radius / 6, 0, Math.PI * 2, true); //black
          ctx.fill();

          ctx.fillStyle = 'black'; //right eyeball
          ctx.beginPath();
          ctx.arc(this.x + this.radius / 3, this.y - this.radius / 5 + this.radius / 6, this.radius / 6, 0, Math.PI * 2, true); //black
          ctx.fill();
          break;

        case GLOBAL['left']:
          ctx.fillStyle = 'black'; //left eyeball
          ctx.beginPath();
          ctx.arc(this.x - this.radius / 3 - this.radius / 5, this.y - this.radius / 5, this.radius / 6, 0, Math.PI * 2, true); //black
          ctx.fill();

          ctx.fillStyle = 'black'; //right eyeball
          ctx.beginPath();
          ctx.arc(this.x + this.radius / 3 - this.radius / 15, this.y - this.radius / 5, this.radius / 6, 0, Math.PI * 2, true); //black
          ctx.fill();
          break;

        case GLOBAL['right']:
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
    return getRowIndex(this.y);
  }

  public getCol() {
    return getColIndex(this.x);
  }

  public moveOneStep() {
    // body...
    let newX = 0;
    let newY = 0;
    if (!canMove(this.x, this.y, this.dir)) {
      return;
    }
    switch (this.dir) {

      case GLOBAL['up']:
        newY = this.y - this.speed;
        if (newY - this.radius - GLOBAL['WALL_WIDTH'] > 0) {
          this.y = newY;
        }
        break;

      case GLOBAL['down']:
        newY = this.y + this.speed;
        if (newY + this.radius + GLOBAL['WALL_WIDTH'] < CANVAS_HEIGHT) {
          this.y = newY;

        }
        break;

      case GLOBAL['left']:
        newX = this.x - this.speed;
        if (newX - this.radius - GLOBAL['WALL_WIDTH'] > 0) {
          this.x = newX;
        }
        break;

      case GLOBAL['right']:
        newX = this.x + this.speed;

        if (newX + this.radius + GLOBAL['WALL_WIDTH'] < CANVAS_WIDTH) {
          this.x = newX;
        }
        break;

      default:
        break;
    }
  }

  public turnBack() {
    this.dir = oppositeDir(this.dir);
  }

  public move(mrPacman, weakCounter) {
    this.isMoving = !this.isMoving; //so the ghost looks like it's moving
    if (this.isWeak) {
      //if weak, reduce speed and make an immediate turn.
      //Ghost starts making random moves until turning back to normal
      this.speed = GLOBAL['speed'] / 2;
      if (weakCounter === GLOBAL['WEAK_DURATION']) {
        this.dir = oppositeDir(this.dir);
      }
      if (onGridCenter(this.x, this.y) === false) {
        this.moveOneStep();
      } else {
        const currGrid = maze[getRowIndex(this.y)][getColIndex(this.x)];
        if (currGrid.gridType === GLOBAL['LEFT_TOP_RIGHT']) {
          this.dir = GLOBAL['down'];
          this.moveOneStep();
        } else if (currGrid.gridType === GLOBAL['TOP_RIGHT_BOTTOM']) {
          this.dir = GLOBAL['left'];
          this.moveOneStep();
        } else if (currGrid.gridType === GLOBAL['RIGHT_BOTTOM_LEFT']) {
          this.dir = GLOBAL['up'];
          this.moveOneStep();
        } else if (currGrid.gridType === GLOBAL['BOTTOM_LEFT_TOP']) {
          this.dir = GLOBAL['right'];
          this.moveOneStep();
        } else {
          this.randomMove();
        }

      }

      this.stepCounter++;
    } else {
      //normal ghost
      if (this.stepCounter != 0 && this.stepCounter % 2 != 0) {
        this.speed = GLOBAL['speed'] / 2;
        this.stepCounter = 0;
      } else {
        this.speed = GLOBAL['speed'];
      }
      if (onGridCenter(this.x, this.y) === false) {
        this.moveOneStep();
      } else {
        // on grid center
        //first check if dead end
        const currGrid_ = maze[getRowIndex(this.y)][getColIndex(this.x)];
        if (currGrid_.gridType === GLOBAL['LEFT_TOP_RIGHT']) {
          this.dir = GLOBAL['down'];
          this.moveOneStep();
        } else if (currGrid_.gridType === GLOBAL['TOP_RIGHT_BOTTOM']) {
          this.dir = GLOBAL['left'];
          this.moveOneStep();
        } else if (currGrid_.gridType === GLOBAL['RIGHT_BOTTOM_LEFT']) {
          this.dir = GLOBAL['up'];
          this.moveOneStep();
        } else if (currGrid_.gridType === GLOBAL['BOTTOM_LEFT_TOP']) {
          this.dir = GLOBAL['right'];
          this.moveOneStep();
        } else {
          switch (this.color) {
            case GLOBAL['red']:
              //blinky
              this.blinkyMove(mrPacman);
              break;

            case GLOBAL['cyan']:
            case GLOBAL['orange']:
              //inky
              this.inkyMove();
              break;

            case GLOBAL['pink']:
              //pinky
              this.pinkyMove(mrPacman);
              break;
          }
        }
      }
    }
  }

  public blinkyMove(mrPacman) {
    this.moveToPacman(true, mrPacman);
  }

  public pinkyMove(mrPacman) {
    this.moveToPacman(false, mrPacman);
  }

  public inkyMove() {
    this.randomMove();
  }

  public moveToPacman(targetPacman, mrPacman) {
    const veryLargeDistance = CANVAS_WIDTH * CANVAS_HEIGHT;
    let leftDist;
    let rightDist;
    let upDist;
    let downDist;
    const currDir = this.dir;
    let minDist = veryLargeDistance;
    //get distance if moved to left
    if (currDir === GLOBAL['right'] || !canMove(this.x, this.y, GLOBAL['left'])) {
      leftDist = veryLargeDistance;
    } else {
      leftDist = this.getTestDistance(GLOBAL['left'], targetPacman, mrPacman);
    }

    //get distance to right
    if (currDir === GLOBAL['left'] || !canMove(this.x, this.y, GLOBAL['right'])) {
      rightDist = veryLargeDistance;
    } else {
      rightDist = this.getTestDistance(GLOBAL['right'], targetPacman, mrPacman);
    }

    //get distance - up
    if (currDir === GLOBAL['down'] || !canMove(this.x, this.y, GLOBAL['up'])) {
      upDist = veryLargeDistance;
    } else {
      upDist = this.getTestDistance(GLOBAL['up'], targetPacman, mrPacman);
    }

    //get distance - down
    if (currDir === GLOBAL['up'] || !canMove(this.x, this.y, GLOBAL['down'])) {
      downDist = veryLargeDistance;
    } else {
      downDist = this.getTestDistance(GLOBAL['down'], targetPacman, mrPacman);
    }
    this.dir = currDir;
    minDist = Math.min(Math.min(leftDist, rightDist), Math.min(upDist, downDist));
    switch (minDist) {
      case leftDist:
        this.dir = GLOBAL['left'];
        break;

      case rightDist:
        this.dir = GLOBAL['right'];
        break;

      case upDist:
        this.dir = GLOBAL['up'];
        break;

      case downDist:
        this.dir = GLOBAL['down'];
        break;
    }
    this.moveOneStep();
  }

  public getTestDistance(dir, targetPacman, mrPacman) {
    let toReturn = 0;
    this.dir = dir;
    this.moveOneStep();
    if (targetPacman) {
      toReturn = Math.sqrt(Math.pow((this.x - mrPacman.x), 2) + Math.pow(this.y - mrPacman.y, 2));
    } else {
      switch (mrPacman.dir) {
        case GLOBAL['left']:
          toReturn = Math.sqrt(Math.pow((this.x - (mrPacman.x - 4 * GLOBAL['GRID_WIDTH'])), 2) + Math.pow(this.y - mrPacman.y, 2));
          break;

        case GLOBAL['right']:
          toReturn = Math.sqrt(Math.pow((this.x - (mrPacman.x + 4 * GLOBAL['GRID_WIDTH'])), 2) + Math.pow(this.y - mrPacman.y, 2));
          break;

        case GLOBAL['up']:
          toReturn = Math.sqrt(Math.pow((this.x - mrPacman.x), 2) + Math.pow(this.y - (mrPacman.y - 4 * GLOBAL['GRID_HEIGHT']), 2));
          break;

        case GLOBAL['down']:
          toReturn = Math.sqrt(Math.pow((this.x - mrPacman.x), 2) + Math.pow(this.y - (mrPacman.y + 4 * GLOBAL['GRID_HEIGHT']), 2));
          break;

        default:
          toReturn = Math.sqrt(Math.pow((this.x - mrPacman.x), 2) + Math.pow(this.y - mrPacman.y, 2));
          break;

      }
    }
    this.turnBack();
    this.moveOneStep();
    return toReturn;
  }

  public randomMove() {
    let nextDir = Math.floor(Math.random() * 4) + 1;
    while (true) {
      if (nextDir != oppositeDir(this.dir) &&
        canMove(this.x, this.y, nextDir)) {
        break;
      }
      nextDir = Math.floor(Math.random() * 4) + 1;
    }
    this.dir = nextDir;
    this.moveOneStep();
  }
}
/*=================Grid================*/
export class Grid {
  public x;
  public y;
  public gridType;
  public beanType;
  public hasBean = true;

  constructor(xCord, yCord, gridType, beanType) {
    this.x = xCord;
    this.y = yCord;
    this.gridType = gridType === undefined ? GLOBAL['EMPTY_GRID'] : gridType;
    this.beanType = beanType;
  }

  public getRow() {
    return getRowIndex(this.y);
  }

  public getCol() {
    return getColIndex(this.x);
  }

  public toString() {
    return 'Grid (' + this.x + ',' + this.y + ') - Grid Type: ' + this.gridType;
  }

  public draw(ctx) {
    ctx.fillStyle = GLOBAL['BG_COLOR'];
    ctx.fillRect(this.x, this.y, GLOBAL['GRID_WIDTH'], GLOBAL['GRID_HEIGHT']);
    const gridType = this.gridType;
    if (gridType === undefined || gridType === GLOBAL['EMPTY_GRID']) {
      this.drawBean(ctx);
      return;
    }

    switch (gridType) {
      case GLOBAL['LEFT_ONLY']:
        this.addLeftEdge(ctx);
        break;

      case GLOBAL['RIGHT_ONLY']:
        this.addRightEdge(ctx);
        break;

      case GLOBAL['TOP_ONLY']:
        this.addTopEdge(ctx);
        break;

      case GLOBAL['BOTTOM_ONLY']:
        this.addBottomEdge(ctx);
        break;

      case GLOBAL['LEFT_RIGHT']:
        this.addLeftEdge(ctx);
        this.addRightEdge(ctx);
        break;

      case GLOBAL['LEFT_TOP']:
        this.addLeftEdge(ctx);
        this.addTopEdge(ctx);
        break;

      case GLOBAL['LEFT_BOTTOM']:
        this.addLeftEdge(ctx);
        this.addBottomEdge(ctx);
        break;

      case GLOBAL['RIGHT_TOP']:
        this.addRightEdge(ctx);
        this.addTopEdge(ctx);
        break;

      case GLOBAL['RIGHT_BOTTOM']:
        this.addRightEdge(ctx);
        this.addBottomEdge(ctx);
        break;

      case GLOBAL['TOP_BOTTOM']:
        this.addTopEdge(ctx);
        this.addBottomEdge(ctx);
        break;

      case GLOBAL['CROSS_RD']:
        this.makeCrossRoad(ctx);
        break;

      case GLOBAL['LEFT_TOP_RIGHT']:
        this.addLeftEdge(ctx);
        this.addTopEdge(ctx);
        this.addRightEdge(ctx);
        break;

      case GLOBAL['TOP_RIGHT_BOTTOM']:
        this.addTopEdge(ctx);
        this.addRightEdge(ctx);
        this.addBottomEdge(ctx);
        break;

      case GLOBAL['RIGHT_BOTTOM_LEFT']:
        this.addRightEdge(ctx);
        this.addBottomEdge(ctx);
        this.addLeftEdge(ctx);
        break;

      case GLOBAL['BOTTOM_LEFT_TOP']:
        this.addBottomEdge(ctx);
        this.addLeftEdge(ctx);
        this.addTopEdge(ctx);
        break;

      case GLOBAL['CLOSED_GRID']:
        this.addLeftEdge(ctx);
        this.addTopEdge(ctx);
        this.addBottomEdge(ctx);
        this.addRightEdge(ctx);
        break;

      default:
        break;
    }
    this.drawBean(ctx);
  }

  public addLeftEdge(ctx) {
    ctx.fillStyle = GLOBAL['BORDER_COLOR'];
    ctx.fillRect(this.x, this.y, GLOBAL['WALL_WIDTH'], GLOBAL['GRID_HEIGHT']);
  }

  public addRightEdge(ctx) {
    ctx.fillStyle = GLOBAL['BORDER_COLOR'];
    ctx.fillRect(this.x + GLOBAL['GRID_WIDTH'] - GLOBAL['WALL_WIDTH'], this.y, GLOBAL['WALL_WIDTH'], GLOBAL['GRID_HEIGHT']);
  }

  public addTopEdge(ctx) {
    ctx.fillStyle = GLOBAL['BORDER_COLOR'];
    ctx.fillRect(this.x, this.y, GLOBAL['GRID_WIDTH'], GLOBAL['WALL_WIDTH']);
  }

  public addBottomEdge(ctx) {
    ctx.fillStyle = GLOBAL['BORDER_COLOR'];
    ctx.fillRect(this.x, this.y + GLOBAL['GRID_HEIGHT'] - GLOBAL['WALL_WIDTH'], GLOBAL['GRID_WIDTH'], GLOBAL['WALL_WIDTH']);
  }

  public makeCrossRoad(ctx) {
    ctx.fillStyle = GLOBAL['BORDER_COLOR'];
    ctx.fillRect(this.x, this.y, GLOBAL['WALL_WIDTH'], GLOBAL['WALL_WIDTH']);
    ctx.fillRect(this.x + GLOBAL['GRID_WIDTH'] - GLOBAL['WALL_WIDTH'], this.y, GLOBAL['WALL_WIDTH'], GLOBAL['WALL_WIDTH']);
    ctx.fillRect(this.x, this.y + GLOBAL['GRID_HEIGHT'] - GLOBAL['WALL_WIDTH'], GLOBAL['WALL_WIDTH'], GLOBAL['WALL_WIDTH']);
    ctx.fillRect(this.x + GLOBAL['GRID_WIDTH'] - GLOBAL['WALL_WIDTH'], this.y + GLOBAL['GRID_HEIGHT'] - GLOBAL['WALL_WIDTH'], GLOBAL['WALL_WIDTH'], GLOBAL['WALL_WIDTH']);
  }

  public drawBean(ctx) {
    const beanType = this.beanType;
    const centerX = this.x + GLOBAL['GRID_WIDTH'] / 2;
    const centerY = this.y + GLOBAL['GRID_HEIGHT'] / 2;

    ctx.fillStyle = GLOBAL['BEAN_COLOR'];
    if (beanType === undefined) {
      return;
    }

    if (beanType === GLOBAL['NORMAL_BEAN']) {
      circle(ctx, centerX, centerY, GLOBAL['NORMAL_BEAN_RADIUS']);
    } else if (beanType === GLOBAL['POWER_BEAN']) {
      circle(ctx, centerX, centerY, GLOBAL['POWER_BEAN_RADIUS']);
    } else {
      //unkwon bean type
      return;
    }
  }
}

/*=================Util Methods================*/

//draw a circle
function circle(ctx_, cx, cy, radius) {
  ctx_.beginPath();
  ctx_.arc(cx, cy, radius, 0, 2 * Math.PI, true);
  ctx_.fill();
}

//get opposite direction
function oppositeDir(dir) {
  switch (dir) {
    case GLOBAL['up']:
      return GLOBAL['down'];

    case GLOBAL['down']:
      return GLOBAL['up'];

    case GLOBAL['left']:
      return GLOBAL['right'];

    case GLOBAL['right']:
      return GLOBAL['left'];

    default:
      return -1; //err
  }
}

export function getRowIndex(yCord) {
  if (yCord === undefined) {
    return -1; //err
  }
  return Math.floor(yCord / GLOBAL['GRID_HEIGHT']);
}

export function getColIndex(xCord) {
  if (xCord === undefined) {
    return -1; //err
  }
  return Math.floor(xCord / GLOBAL['GRID_WIDTH']);
}

function canMove(x, y, dir) {
  if (!onGridCenter(x, y)) {
    return true;
  }
  let canMove_ = false;
  const currGrid = maze[getRowIndex(y)][getColIndex(x)];
  const gridType = currGrid.gridType;
  switch (dir) {
    case GLOBAL['up']:
      if (gridType != GLOBAL['LEFT_TOP'] && gridType != GLOBAL['RIGHT_TOP'] && gridType != GLOBAL['TOP_BOTTOM'] &&
        gridType != GLOBAL['TOP_ONLY'] && gridType != GLOBAL['LEFT_TOP_RIGHT'] &&
        gridType != GLOBAL['TOP_RIGHT_BOTTOM'] && gridType != GLOBAL['BOTTOM_LEFT_TOP']) {
        canMove_ = true;
      }
      break;

    case GLOBAL['down']:
      if (gridType != GLOBAL['LEFT_BOTTOM'] && gridType != GLOBAL['TOP_BOTTOM'] && gridType != GLOBAL['RIGHT_BOTTOM'] &&
        gridType != GLOBAL['BOTTOM_ONLY'] && gridType != GLOBAL['RIGHT_BOTTOM_LEFT'] &&
        gridType != GLOBAL['BOTTOM_LEFT_TOP'] && gridType != GLOBAL['TOP_RIGHT_BOTTOM']) {
        canMove_ = true;
      }
      break;

    case GLOBAL['left']:
      if (gridType != GLOBAL['LEFT_BOTTOM'] && gridType != GLOBAL['LEFT_TOP'] && gridType != GLOBAL['LEFT_ONLY'] &&
        gridType != GLOBAL['LEFT_RIGHT'] && gridType != GLOBAL['LEFT_TOP_RIGHT'] &&
        gridType != GLOBAL['BOTTOM_LEFT_TOP'] && gridType != GLOBAL['RIGHT_BOTTOM_LEFT']) {
        canMove_ = true;
      }
      break;

    case GLOBAL['right']:
      if (gridType != GLOBAL['RIGHT_BOTTOM'] && gridType != GLOBAL['RIGHT_TOP'] && gridType != GLOBAL['RIGHT_ONLY'] &&
        gridType != GLOBAL['LEFT_RIGHT'] && gridType != GLOBAL['RIGHT_BOTTOM_LEFT'] &&
        gridType != GLOBAL['TOP_RIGHT_BOTTOM'] && gridType != GLOBAL['LEFT_TOP_RIGHT']) {
        canMove_ = true;
      }
      break;
    default:
      break;
  }
  return canMove_;
}

export function onGridCenter(x, y) {
  return xOnGridCenter(y) && yOnGridCenter(x);
}

export function xOnGridCenter(y) {
  return (((y - GLOBAL['GRID_WIDTH'] / 2) % GLOBAL['GRID_WIDTH']) === 0);
}

export function yOnGridCenter(x) {
  return (((x - GLOBAL['GRID_HEIGHT'] / 2) % GLOBAL['GRID_HEIGHT']) === 0);
}

export function initMaze(ctx) {
  for (let i = 0; i < maze.length; i++) {
    const oneRow = new Array(CANVAS_WIDTH / GLOBAL['GRID_WIDTH']);
    maze[i] = oneRow;
  }

  // draw maze with full beans
  for (let row = 0; row < CANVAS_HEIGHT / GLOBAL['GRID_HEIGHT']; row++) {
    for (let col = 0; col < CANVAS_WIDTH / GLOBAL['GRID_WIDTH']; col++) {
      const beanType = GLOBAL['NORMAL_BEAN'];
      const newGrid = new Grid(col * GLOBAL['GRID_WIDTH'], row * GLOBAL['GRID_HEIGHT'], mazeContent[row][col], beanType);

      maze[row][col] = newGrid;
      newGrid.draw(ctx);
    }
  }

  //overwrite beans that shouldn't ecist
  for (let i = 0; i < GLOBAL['noBean'].length; i++) {
    const x = GLOBAL['noBean'][i][0];
    const y = GLOBAL['noBean'][i][1];
    maze[x][y].beanType = undefined;
    maze[x][y].draw(ctx);
  }

  // draw power beansx
  for (let i = 0; i < GLOBAL['powerBeans'].length; i++) {
    const x = GLOBAL['powerBeans'][i][0];
    const y = GLOBAL['powerBeans'][i][1];
    maze[x][y].beanType = GLOBAL['POWER_BEAN'];
    maze[x][y].draw(ctx);
  }
}

export function showScore(ctx) {
  if (!ctx) { return; }
  ctx.fillStyle = 'black';
  ctx.fillRect(CANVAS_WIDTH - 250, 10, 190, 40);
  ctx.fillStyle = 'white';
  ctx.font = '24px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('score: ' + Math.floor(GLOBAL['score']), CANVAS_WIDTH - 250, 37);
}

export function showLives(ctx, pacman_color) {
  if (!ctx) { return; }
  ctx.fillStyle = 'black';
  ctx.fillRect(CANVAS_WIDTH - 80, 10, 70, 30);
  for (let i = 0; i < GLOBAL['life'] - 1; i++) {
    GLOBAL['lives'][i] = new Pacman(CANVAS_WIDTH - 50 + 25 * i, 30, pacman_color, GLOBAL['right']);
    GLOBAL['lives'][i].draw(ctx);
  }
}

export function printInstruction(ctx, ghosts) {
  if (!ctx) { return; }
  ctx.fillStyle = 'white';
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';

  const txt = 'WELCOME TO \nPACMAN 15-237!\n\n\nArrow keys or\nWASD to move\n\nHAVE FUN!'; //Q to pause\nE to resume\nR to restart
  const x = 12;
  const y = CANVAS_HEIGHT - 200;
  const lineheight = 15;
  const lines = txt.split('\n');

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, y + (i * lineheight));
  }

  if (ghosts.length === 0) {
    ctx.fillStyle = 'black';
    ctx.fillRect(x, CANVAS_WIDTH - 40, 70, 30);
    ctx.fillStyle = 'red';
    ctx.font = '16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('GOD MODE', x, CANVAS_WIDTH - 20);
  }
}

export function fixGrids(x, y, ctx) {
  const row = getRowIndex(y);
  const col = getColIndex(x);

  if (xOnGridCenter(y)) {
    maze[row][col].draw(ctx);
    if (col + 1 < maze.length && !staticArrayContains([row, col + 1])) {
      maze[row][col + 1].draw(ctx);
    }
    if (col - 1 >= 0 && !staticArrayContains([row, col - 1])) {
      maze[row][col - 1].draw(ctx);
    }
  } else if (yOnGridCenter(x)) {
    maze[row][col].draw(ctx);
    if (row + 1 < maze.length && !staticArrayContains([row + 1, col])) {
      maze[row + 1][col].draw(ctx);
    }
    if (row - 1 >= 0 && !staticArrayContains([row - 1, col])) {
      maze[row - 1][col].draw(ctx);
    }
  }
}

function staticArrayContains(cord) {
  const x = cord[0];
  const y = cord[1];
  for (let i = 0; i < GLOBAL['staticGrids'].length; i++) {
    if (x === GLOBAL['staticGrids'][i][0] &&
      y === GLOBAL['staticGrids'][i][1]) {
      return true;
    }
  }
  return false;
}

export function loseMessage(ctx) {
  if (!ctx) { return; }
  //draw popup
  ctx.fillStyle = 'black';
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 5;
  ctx.fillRect(CANVAS_WIDTH / 2 - 100, CANVAS_HEIGHT / 2 - 40, 200, 100);
  ctx.strokeRect(CANVAS_WIDTH / 2 - 100, CANVAS_HEIGHT / 2 - 40, 200, 100);

  //write message
  ctx.textAlign = 'center';
  ctx.fillStyle = 'red';
  ctx.font = '26px monospace';
  ctx.fillText('GAME OVER', CANVAS_HEIGHT / 2, CANVAS_HEIGHT / 2 + 7);
  ctx.font = '12px monospace';
  ctx.fillText('press R to play again', CANVAS_HEIGHT / 2, CANVAS_HEIGHT / 2 + 28);
}

export function pacmanWon() {
  return GLOBAL['beansLeft'] === 0;
}

export function winMessage(ctx) {
  if (!ctx) { return; }
  //draw popup
  ctx.fillStyle = 'black';
  ctx.strokeStyle = 'green';
  ctx.lineWidth = 5;
  ctx.fillRect(CANVAS_WIDTH / 2 - 150, CANVAS_HEIGHT / 2 - 40, 300, 100);
  ctx.strokeRect(CANVAS_WIDTH / 2 - 150, CANVAS_HEIGHT / 2 - 40, 300, 100);

  //write message
  ctx.textAlign = 'center';
  ctx.fillStyle = 'white';
  ctx.font = '16px monospace';
  ctx.fillText('Congratulations, you won!', CANVAS_HEIGHT / 2, CANVAS_HEIGHT / 2 + 6);
  ctx.font = '12px monospace';
  ctx.fillText('press R to play again', CANVAS_HEIGHT / 2, CANVAS_HEIGHT / 2 + 28);
}

export function eatBean(ctx, mrPacman, ghosts, weakCounter) {
  if (onGridCenter(mrPacman.x, mrPacman.y)) {
    if (maze[mrPacman.getRow()][mrPacman.getCol()].beanType === GLOBAL['NORMAL_BEAN']) {
      GLOBAL['score'] += 10; //modified
      showScore(ctx);
      GLOBAL['beansLeft']--;
    } else if (maze[mrPacman.getRow()][mrPacman.getCol()].beanType === GLOBAL['POWER_BEAN']) {
      GLOBAL['score'] += 50; //modified
      showScore(ctx);
      GLOBAL['beansLeft']--;

      //ghosts enter weak mode
      for (let i = 0; i < ghosts.length; i++) {
        ghosts[i].isWeak = true;
      }
      weakCounter = GLOBAL['WEAK_DURATION'];
    }
    maze[mrPacman.getRow()][mrPacman.getCol()].beanType = undefined;
    maze[mrPacman.getRow()][mrPacman.getCol()].draw(ctx);
  }
}

export function eatGhost(ctx, mrPacman, ghosts) {
  for (let i = 0; i < ghosts.length; i++) {
    if (Math.abs(mrPacman.x - ghosts[i].x) <= 5 && Math.abs(mrPacman.y - ghosts[i].y) <= 5 &&
      ghosts[i].isWeak && !ghosts[i].isDead) {
      GLOBAL['score'] += Math.floor(GLOBAL['weakBonus']);
      GLOBAL['weakBonus'] *= 2;
      showScore(ctx);
      ghosts[i].isDead = true;
      ghosts[i].toGhostHouse();
    }
  }
}

export function initFields() {
  // body...
  for (let i = 6; i < 10; i++) {
    GLOBAL['powerBeans'][GLOBAL['ghostHouseIndex']] = [i, 9];
    GLOBAL['ghostHouseIndex']++;
  }

  //fill up staticGrids[]
  for (let i = 0; i < 2; i++) {
    for (let j = 8; j < 17; j++) {
      GLOBAL['staticGrids'][GLOBAL['staticGridsIndex']] = [i, j];
      GLOBAL['staticGridsIndex']++;
    }
  }
  for (let i = 9; i < 17; i++) {
    for (let j = 0; j < 4; j++) {
      GLOBAL['staticGrids'][GLOBAL['staticGridsIndex']] = [i, j];
      GLOBAL['staticGridsIndex']++;
    }
  }
  for (let i = 2; i < 6; i++) {
    for (let j = 14; j < 17; j++) {
      GLOBAL['staticGrids'][GLOBAL['staticGridsIndex']] = [i, j];
      GLOBAL['staticGridsIndex']++;
    }
  }

  //fill up noBean[]
  for (let i = 0; i < 2; i++) {
    for (let j = 8; j < 17; j++) {
      GLOBAL['noBean'][GLOBAL['noBeanIndex']] = [i, j];
      GLOBAL['noBeanIndex']++;
    }
  }
  for (let i = 2; i < 6; i++) {
    for (let j = 14; j < 17; j++) {
      GLOBAL['noBean'][GLOBAL['noBeanIndex']] = [i, j];
      GLOBAL['noBeanIndex']++;
    }
  }
  for (let i = 9; i < 17; i++) {
    for (let j = 0; j < 4; j++) {
      GLOBAL['noBean'][GLOBAL['noBeanIndex']] = [i, j];
      GLOBAL['noBeanIndex']++;
    }
  }
  for (let i = 1; i < 6; i++) {
    GLOBAL['noBean'][GLOBAL['noBeanIndex']] = [i, 2];
    GLOBAL['noBeanIndex']++;
  }
  for (let i = 1; i < 4; i += 2) {
    for (let j = 4; j < 7; j++) {
      GLOBAL['noBean'][GLOBAL['noBeanIndex']] = [i, j];
      GLOBAL['noBeanIndex']++;
    }
  }
  for (let j = 8; j < 13; j++) {
    GLOBAL['noBean'][GLOBAL['noBeanIndex']] = [3, j];
    GLOBAL['noBeanIndex']++;
  }
  for (let j = 1; j < 7; j++) {
    GLOBAL['noBean'][GLOBAL['noBeanIndex']] = [7, j];
    GLOBAL['noBeanIndex']++;
  }
  for (let i = 5; i < 10; i++) {
    for (let j = 8; j < 11; j++) {
      GLOBAL['noBean'][GLOBAL['noBeanIndex']] = [i, j];
      GLOBAL['noBeanIndex']++;
    }
  }
  for (let j = 12; j < 16; j++) {
    GLOBAL['noBean'][GLOBAL['noBeanIndex']] = [7, j];
    GLOBAL['noBeanIndex']++;
  }
  for (let j = 12; j < 16; j++) {
    GLOBAL['noBean'][GLOBAL['noBeanIndex']] = [9, j];
    GLOBAL['noBeanIndex']++;
  }
  for (let i = 11; i < 16; i += 2) {
    for (let j = 5; j < 8; j++) {
      GLOBAL['noBean'][GLOBAL['noBeanIndex']] = [i, j];
      GLOBAL['noBeanIndex']++;
    }
  }
  for (let i = 11; i < 16; i += 2) {
    for (let j = 9; j < 12; j++) {
      GLOBAL['noBean'][GLOBAL['noBeanIndex']] = [i, j];
      GLOBAL['noBeanIndex']++;
    }
  }
  for (let j = 13; j < 16; j++) {
    GLOBAL['noBean'][GLOBAL['noBeanIndex']] = [11, j];
    GLOBAL['noBeanIndex']++;
  }
  for (let i = 12; i < 16; i++) {
    GLOBAL['noBean'][GLOBAL['noBeanIndex']] = [i, 15];
    GLOBAL['noBeanIndex']++;
  }
  for (let i = 13; i < 17; i++) {
    GLOBAL['noBean'][GLOBAL['noBeanIndex']] = [i, 13];
    GLOBAL['noBeanIndex']++;
  }
}

export function initCanvas(width, height, ctx) {
  if (width === undefined || !(width instanceof Number)) {
    width = CANVAS_WIDTH;
  }
  if (height === undefined || !(height instanceof Number)) {
    height = CANVAS_HEIGHT;
  }
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

export function welcomeScreen(ctx, intervalId, pacman_color) {
  if (!ctx) { return; }
  GLOBAL['gameOn'] = false;
  GLOBAL['gamePaused'] = false;
  // welcome text
  ctx.fillStyle = 'white';
  ctx.font = '80px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('PACMAN', CANVAS_WIDTH / 2, 170);
  ctx.font = '20px monospace';
  ctx.fillText('Press s to start', CANVAS_WIDTH / 2, 220);
  ctx.font = '14px monospace';
  ctx.fillText('DEVELOPED BY: Codemao.cn', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 20 * 19);

  welcomePacman = new Pacman(CANVAS_WIDTH / 5, CANVAS_HEIGHT / 3 * 2, pacman_color, GLOBAL['right']);
  welcomePacman.radius = 30;
  welcomePacman.draw(ctx);

  welcomeBlinky = new Ghost(CANVAS_WIDTH / 5 * 3.3, CANVAS_HEIGHT / 3 * 2, GLOBAL['red'], GLOBAL['left']);
  welcomeBlinky.radius = 30;
  welcomeBlinky.draw(ctx);

  welcomeInky = new Ghost(CANVAS_WIDTH / 5 * 4, CANVAS_HEIGHT / 3 * 2, GLOBAL['cyan'], GLOBAL['right']);
  welcomeInky.radius = 30;
  welcomeInky.draw(ctx);
  intervalId = setInterval(updateWelcomeScreen, GLOBAL['timerDelay'] * 2);
}

export function gameOver(mrPacman, ghosts) {
  for (let i = 0; i < ghosts.length; i++) {
    if (Math.abs(mrPacman.x - ghosts[i].x) <= 5 && Math.abs(mrPacman.y - ghosts[i].y) <= 5 &&
      !ghosts[i].isWeak) {
      return true;
    }
  }
  return false;
}

export function sleep(ms) {
  const dt = new Date();
  dt.setTime(dt.getTime() + ms);
  while (new Date().getTime() < dt.getTime()) {  }
}

function updateWelcomeScreen(ctx) {
  if (!ctx) { return; }
  ctx.fillStyle = 'black';
  ctx.fillRect(0, CANVAS_HEIGHT / 2, CANVAS_WIDTH, 140);
  welcomePacman.mouthOpen = !welcomePacman.mouthOpen;
  welcomeBlinky.isMoving = !welcomeBlinky.isMoving;
  welcomeInky.isMoving = !welcomeInky.isMoving;
  welcomePacman.draw(ctx);
  welcomeInky.draw(ctx);
  welcomeBlinky.draw(ctx);
}
