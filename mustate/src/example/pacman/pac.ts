/*======================GLOBAL lets====================*/
// directions
const UP = 1;
const DOWN = 2;
const LEFT = 3;
const RIGHT = 4;

export const CANVAS_WIDTH = 510;
export const CANVAS_HEIGHT = 510;
let ctx;

// game grid
const GRID_WIDTH = 30;
const GRID_HEIGHT = 30;
const WALL_WIDTH = 3;
const numRows = CANVAS_WIDTH / GRID_HEIGHT;
const numCols = CANVAS_HEIGHT / GRID_WIDTH;

// colors for UI & Pacman
const BG_COLOR = 'black';
const BORDER_COLOR = 'blue';
const BEAN_COLOR = 'white';
const PACMAN_COLOR = 'yellow';

// colors for ghost
const RED = 'red';
const PINK = '#ff9cce';
const CYAN = '#00ffde';
const ORANGE = '#ffb847';
const WEAK_COLOR = '#0031ff';
const BLINKING_COLOR = 'white';

// size of sprites
const NORMAL_BEAN_RADIUS = 2;
const POWER_BEAN_RADIUS = 5;
const PACMAN_RADIUS = 9;
const GHOST_RADIUS = 9;

// game parameters
let intervalId;
let restartTimer = 0;
const timerDelay = 80;
const speed = 5;
let score = 0;
const lives:Pacman[] = [];
const MAX_LIFE = 3;
let life = MAX_LIFE;
let weakBonus = 200;
const MAX_BEANS = 136;
let beansLeft = MAX_BEANS;
let weakCounter;
const WEAK_DURATION = 10000 / timerDelay;

//bean cases
const NORMAL_BEAN = 1;
const POWER_BEAN = 2;

//spirtes instances
let welcomePacman;
let welcomeBlinky;
let welcomeInky;
let mrPacman;
let blinky;
let inky;
let pinky;
let clyde;
let ghosts;

//grid
const id = -1;

//wall cases
const CROSS_RD = -1; //no wall
const LEFT_ONLY = 0;
const TOP_ONLY = 1;
const RIGHT_ONLY = 2;
const BOTTOM_ONLY = 3;

const LEFT_RIGHT = 4;
const LEFT_TOP = 5;
const LEFT_BOTTOM = 6;

const RIGHT_TOP = 7;
const RIGHT_BOTTOM = 8;
const TOP_BOTTOM = 9;

const BOTTOM_LEFT_TOP = 10;
const LEFT_TOP_RIGHT = 11;
const TOP_RIGHT_BOTTOM = 12;
const RIGHT_BOTTOM_LEFT = 13;

const EMPTY_GRID = 14;
const CLOSED_GRID = 15;

//game state and map
let gameOn = false;
let gamePaused = false;
const maze = new Array(CANVAS_HEIGHT / GRID_HEIGHT);
const mazeContent = [
  //row1
  [LEFT_TOP, TOP_BOTTOM, TOP_BOTTOM, TOP_ONLY, TOP_BOTTOM,
    TOP_BOTTOM, TOP_BOTTOM, RIGHT_TOP, LEFT_TOP, TOP_ONLY,
    TOP_ONLY, TOP_ONLY, TOP_ONLY, TOP_ONLY, TOP_ONLY,
    TOP_ONLY, RIGHT_TOP,
  ],
  //row2
  [LEFT_RIGHT, BOTTOM_LEFT_TOP, RIGHT_TOP, LEFT_RIGHT, LEFT_TOP,
    TOP_BOTTOM, TOP_RIGHT_BOTTOM, LEFT_RIGHT, LEFT_BOTTOM, BOTTOM_ONLY,
    BOTTOM_ONLY, BOTTOM_ONLY, BOTTOM_ONLY, BOTTOM_ONLY, EMPTY_GRID,
    EMPTY_GRID, RIGHT_ONLY,
  ],
  //row3
  [LEFT_BOTTOM, RIGHT_TOP, LEFT_RIGHT, LEFT_RIGHT, LEFT_RIGHT,
    BOTTOM_LEFT_TOP, TOP_BOTTOM, EMPTY_GRID, TOP_BOTTOM, TOP_BOTTOM,
    TOP_BOTTOM, TOP_BOTTOM, TOP_BOTTOM, RIGHT_TOP, LEFT_ONLY,
    EMPTY_GRID, RIGHT_ONLY,
  ],
  //row4
  [CLOSED_GRID, LEFT_RIGHT, LEFT_RIGHT, LEFT_RIGHT, LEFT_BOTTOM,
    TOP_BOTTOM, RIGHT_TOP, LEFT_RIGHT, BOTTOM_LEFT_TOP, TOP_BOTTOM,
    TOP_BOTTOM, TOP_BOTTOM, TOP_RIGHT_BOTTOM, LEFT_RIGHT, LEFT_ONLY,
    EMPTY_GRID, RIGHT_ONLY,
  ],
  //row5
  [LEFT_TOP, RIGHT_BOTTOM, LEFT_RIGHT, LEFT_BOTTOM, TOP_ONLY,
    TOP_RIGHT_BOTTOM, LEFT_RIGHT, LEFT_ONLY, TOP_BOTTOM, TOP_BOTTOM,
    TOP_BOTTOM, TOP_ONLY, TOP_BOTTOM, RIGHT_BOTTOM, LEFT_ONLY,
    EMPTY_GRID, RIGHT_ONLY,
  ],
  //row6
  [LEFT_RIGHT, BOTTOM_LEFT_TOP, BOTTOM_ONLY, TOP_RIGHT_BOTTOM, LEFT_RIGHT,
    BOTTOM_LEFT_TOP, RIGHT_BOTTOM, LEFT_RIGHT, LEFT_TOP, TOP_BOTTOM,
    RIGHT_TOP, LEFT_RIGHT, BOTTOM_LEFT_TOP, TOP_BOTTOM, BOTTOM_ONLY,
    BOTTOM_ONLY, RIGHT_BOTTOM,
  ],
  //row7
  [LEFT_ONLY, TOP_BOTTOM, TOP_BOTTOM, TOP_BOTTOM, BOTTOM_ONLY,
    TOP_BOTTOM, TOP_BOTTOM, RIGHT_ONLY, LEFT_RIGHT, LEFT_TOP_RIGHT,
    LEFT_RIGHT, LEFT_ONLY, TOP_BOTTOM, TOP_BOTTOM, TOP_BOTTOM,
    TOP_BOTTOM, RIGHT_TOP,
  ],
  //row8
  [LEFT_RIGHT, BOTTOM_LEFT_TOP, TOP_BOTTOM, TOP_BOTTOM, TOP_BOTTOM,
    TOP_BOTTOM, TOP_RIGHT_BOTTOM, LEFT_RIGHT, LEFT_RIGHT, LEFT_RIGHT,
    LEFT_RIGHT, LEFT_RIGHT, BOTTOM_LEFT_TOP, TOP_BOTTOM, TOP_BOTTOM,
    TOP_RIGHT_BOTTOM, LEFT_RIGHT,
  ],
  //row9
  [LEFT_BOTTOM, TOP_BOTTOM, TOP_BOTTOM, TOP_BOTTOM, TOP_ONLY,
    TOP_BOTTOM, TOP_BOTTOM, RIGHT_ONLY, LEFT_RIGHT, LEFT_RIGHT,
    LEFT_RIGHT, LEFT_ONLY, TOP_BOTTOM, TOP_BOTTOM, TOP_BOTTOM,
    TOP_BOTTOM, RIGHT_ONLY,
  ],
  //row10
  [LEFT_TOP, TOP_ONLY, TOP_ONLY, RIGHT_TOP, LEFT_RIGHT,
    BOTTOM_LEFT_TOP, TOP_RIGHT_BOTTOM, LEFT_RIGHT, RIGHT_BOTTOM_LEFT, LEFT_RIGHT,
    RIGHT_BOTTOM_LEFT, LEFT_RIGHT, BOTTOM_LEFT_TOP, TOP_BOTTOM, TOP_BOTTOM,
    TOP_RIGHT_BOTTOM, LEFT_RIGHT,
  ],
  //row11
  [LEFT_ONLY, EMPTY_GRID, EMPTY_GRID, RIGHT_ONLY, LEFT_ONLY,
    TOP_BOTTOM, TOP_BOTTOM, BOTTOM_ONLY, TOP_ONLY, BOTTOM_ONLY,
    TOP_BOTTOM, BOTTOM_ONLY, TOP_ONLY, TOP_BOTTOM, TOP_BOTTOM,
    TOP_BOTTOM, RIGHT_ONLY,
  ],
  //row12
  [LEFT_ONLY, EMPTY_GRID, EMPTY_GRID, RIGHT_ONLY, LEFT_RIGHT,
    BOTTOM_LEFT_TOP, TOP_BOTTOM, RIGHT_TOP, LEFT_RIGHT, BOTTOM_LEFT_TOP,
    TOP_BOTTOM, RIGHT_TOP, LEFT_RIGHT, BOTTOM_LEFT_TOP, TOP_BOTTOM,
    RIGHT_TOP, LEFT_RIGHT,
  ],
  //row13
  [LEFT_ONLY, EMPTY_GRID, EMPTY_GRID, RIGHT_ONLY, LEFT_ONLY,
    TOP_BOTTOM, TOP_RIGHT_BOTTOM, LEFT_RIGHT, LEFT_ONLY, TOP_BOTTOM,
    TOP_RIGHT_BOTTOM, LEFT_RIGHT, LEFT_ONLY, TOP_BOTTOM, RIGHT_TOP,
    LEFT_RIGHT, LEFT_RIGHT,
  ],
  //row14
  [LEFT_ONLY, EMPTY_GRID, EMPTY_GRID, RIGHT_ONLY, LEFT_RIGHT,
    LEFT_TOP, TOP_BOTTOM, RIGHT_BOTTOM, LEFT_RIGHT, BOTTOM_LEFT_TOP,
    TOP_BOTTOM, RIGHT_ONLY, LEFT_RIGHT, LEFT_TOP_RIGHT, LEFT_RIGHT,
    LEFT_RIGHT, LEFT_RIGHT,
  ],
  //row15
  [LEFT_ONLY, EMPTY_GRID, EMPTY_GRID, RIGHT_ONLY, LEFT_RIGHT,
    LEFT_RIGHT, BOTTOM_LEFT_TOP, TOP_BOTTOM, EMPTY_GRID, TOP_BOTTOM,
    TOP_RIGHT_BOTTOM, LEFT_RIGHT, LEFT_RIGHT, LEFT_RIGHT, LEFT_RIGHT,
    LEFT_RIGHT, LEFT_RIGHT,
  ],
  //row16
  [LEFT_ONLY, EMPTY_GRID, EMPTY_GRID, RIGHT_ONLY, LEFT_RIGHT,
    LEFT_BOTTOM, TOP_BOTTOM, TOP_RIGHT_BOTTOM, LEFT_RIGHT, BOTTOM_LEFT_TOP,
    TOP_BOTTOM, RIGHT_BOTTOM, LEFT_RIGHT, LEFT_RIGHT, LEFT_RIGHT,
    RIGHT_BOTTOM_LEFT, LEFT_RIGHT,
  ],
  //row17
  [LEFT_BOTTOM, BOTTOM_ONLY, BOTTOM_ONLY, RIGHT_BOTTOM, LEFT_BOTTOM,
    TOP_BOTTOM, TOP_BOTTOM, TOP_BOTTOM, BOTTOM_ONLY, TOP_BOTTOM,
    TOP_BOTTOM, TOP_BOTTOM, RIGHT_BOTTOM, RIGHT_BOTTOM_LEFT, LEFT_BOTTOM,
    TOP_BOTTOM, RIGHT_BOTTOM,
  ],
];

// grids that don't redraw
const staticGrids:number[][] = [];
let staticGridsIndex = 0;

// start location of pacman
const pacmanStartLoc = [4, 9];

// grids with no beans
const noBean = [pacmanStartLoc, [5, 12],
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
let noBeanIndex = noBean.length;

// power beans in maze
const powerBeans = [
  [0, 0],
  [2, 13],
  [16, 4],
  [16, 16],
  [2, 5],
  [14, 10],
];

// ghost house
const ghostHouse:number[][] = [];
let ghostHouseIndex = 0;

/*======================Pacman====================*/
export class Pacman {
  public x:number;
  public y:number;
  public dir:number;
  public nextDir:number|undefined;
  public radius:number;
  public mouthOpen:boolean;

  constructor(xCord, yCord, direction) {
    this.x = xCord;
    this.y = yCord;
    this.dir = direction;
    this.nextDir = undefined; //the direction to turn at next available turning point
    this.radius = 9;
    this.mouthOpen = true;
  }

  public draw(color = 'yellow') {
    ctx.fillStyle = color;
    ctx.beginPath();

    if (!this.mouthOpen) {
      switch (this.dir) {
        case UP:
          ctx.arc(this.x, this.y, this.radius, 2 * Math.PI - Math.PI * 11 / 18, 2 * Math.PI - Math.PI * 7 / 18, true);
          break;

        case DOWN:
          ctx.arc(this.x, this.y, this.radius, 2 * Math.PI - Math.PI * 29 / 18, 2 * Math.PI - Math.PI * 25 / 18, true);
          break;

        case LEFT:
          ctx.arc(this.x, this.y, this.radius, 2 * Math.PI - Math.PI * 10 / 9, 2 * Math.PI - Math.PI * 8 / 9, true);
          break;

        case RIGHT:
          ctx.arc(this.x, this.y, this.radius, 2 * Math.PI - Math.PI / 9, 2 * Math.PI - Math.PI * 17 / 9, true);
          break;

        default:
          break;
      }
    } else {
      switch (this.dir) {
        case UP:
          ctx.arc(this.x, this.y, this.radius, 2 * Math.PI - Math.PI * 7 / 9, 2 * Math.PI - Math.PI * 2 / 9, true);
          break;

        case DOWN:
          ctx.arc(this.x, this.y, this.radius, 2 * Math.PI - Math.PI * 16 / 9, 2 * Math.PI - Math.PI * 11 / 9, true);
          break;

        case LEFT:
          ctx.arc(this.x, this.y, this.radius, 2 * Math.PI - Math.PI * 23 / 18, 2 * Math.PI - Math.PI * 13 / 18, true);
          break;

        case RIGHT:
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
          (this.dir === UP && this.nextDir === DOWN) ||
          (this.dir === DOWN && this.nextDir === UP) ||
          (this.dir === LEFT && this.nextDir === RIGHT) ||
          (this.dir === RIGHT && this.nextDir === LEFT)
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

      case UP:
        newY = this.y - speed;
        if (newY - this.radius - WALL_WIDTH > 0) {
          this.y = newY;
          this.mouthOpen = !this.mouthOpen;
        }
        break;

      case DOWN:
        newY = this.y + speed;
        if (newY + this.radius + WALL_WIDTH < CANVAS_HEIGHT) {
          this.y = newY;
          this.mouthOpen = !this.mouthOpen;

        }
        break;

      case LEFT:
        newX = this.x - speed;
        if (newX - this.radius - WALL_WIDTH > 0) {
          this.x = newX;
          this.mouthOpen = !this.mouthOpen;
        }
        break;

      case RIGHT:
        newX = this.x + speed;

        if (newX + this.radius + WALL_WIDTH < CANVAS_WIDTH) {
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

  public draw() {
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

      case UP:
        newY = this.y - this.speed;
        if (newY - this.radius - WALL_WIDTH > 0) {
          this.y = newY;
        }
        break;

      case DOWN:
        newY = this.y + this.speed;
        if (newY + this.radius + WALL_WIDTH < CANVAS_HEIGHT) {
          this.y = newY;

        }
        break;

      case LEFT:
        newX = this.x - this.speed;
        if (newX - this.radius - WALL_WIDTH > 0) {
          this.x = newX;
        }
        break;

      case RIGHT:
        newX = this.x + this.speed;

        if (newX + this.radius + WALL_WIDTH < CANVAS_WIDTH) {
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

  public move() {
    this.isMoving = !this.isMoving; //so the ghost looks like it's moving
    if (this.isWeak) {
      //if weak, reduce speed and make an immediate turn.
      //Ghost starts making random moves until turning back to normal
      this.speed = speed / 2;
      if (weakCounter === WEAK_DURATION) {
        this.dir = oppositeDir(this.dir);
      }
      if (onGridCenter(this.x, this.y) === false) {
        this.moveOneStep();
      } else {
        const currGrid = maze[getRowIndex(this.y)][getColIndex(this.x)];
        if (currGrid.gridType === LEFT_TOP_RIGHT) {
          this.dir = DOWN;
          this.moveOneStep();
        } else if (currGrid.gridType === TOP_RIGHT_BOTTOM) {
          this.dir = LEFT;
          this.moveOneStep();
        } else if (currGrid.gridType === RIGHT_BOTTOM_LEFT) {
          this.dir = UP;
          this.moveOneStep();
        } else if (currGrid.gridType === BOTTOM_LEFT_TOP) {
          this.dir = RIGHT;
          this.moveOneStep();
        } else {
          this.randomMove();
        }

      }

      this.stepCounter++;
    } else {
      //normal ghost
      if (this.stepCounter != 0 && this.stepCounter % 2 != 0) {
        this.speed = speed / 2;
        this.stepCounter = 0;
      } else {
        this.speed = speed;
      }
      if (onGridCenter(this.x, this.y) === false) {
        this.moveOneStep();
      } else {
        // on grid center
        //first check if dead end
        const currGrid_ = maze[getRowIndex(this.y)][getColIndex(this.x)];
        if (currGrid_.gridType === LEFT_TOP_RIGHT) {
          this.dir = DOWN;
          this.moveOneStep();
        } else if (currGrid_.gridType === TOP_RIGHT_BOTTOM) {
          this.dir = LEFT;
          this.moveOneStep();
        } else if (currGrid_.gridType === RIGHT_BOTTOM_LEFT) {
          this.dir = UP;
          this.moveOneStep();
        } else if (currGrid_.gridType === BOTTOM_LEFT_TOP) {
          this.dir = RIGHT;
          this.moveOneStep();
        } else {
          switch (this.color) {
            case RED:
              //blinky
              this.blinkyMove();
              break;

            case CYAN:
            case ORANGE:
              //inky
              this.inkyMove();
              break;

            case PINK:
              //pinky
              this.pinkyMove();
              break;
          }
        }
      }
    }
  }

  public blinkyMove() {
    this.moveToPacman(true);
  }

  public pinkyMove() {
    this.moveToPacman(false);
  }

  public inkyMove() {
    this.randomMove();
  }

  public moveToPacman(targetPacman) {
    const veryLargeDistance = CANVAS_WIDTH * CANVAS_HEIGHT;
    let leftDist;
    let rightDist;
    let upDist;
    let downDist;
    const currDir = this.dir;
    let minDist = veryLargeDistance;
    //get distance if moved to left
    if (currDir === RIGHT || !canMove(this.x, this.y, LEFT)) {
      leftDist = veryLargeDistance;
    } else {
      leftDist = this.getTestDistance(LEFT, targetPacman);
    }

    //get distance to right
    if (currDir === LEFT || !canMove(this.x, this.y, RIGHT)) {
      rightDist = veryLargeDistance;
    } else {
      rightDist = this.getTestDistance(RIGHT, targetPacman);
    }

    //get distance - up
    if (currDir === DOWN || !canMove(this.x, this.y, UP)) {
      upDist = veryLargeDistance;
    } else {
      upDist = this.getTestDistance(UP, targetPacman);
    }

    //get distance - down
    if (currDir === UP || !canMove(this.x, this.y, DOWN)) {
      downDist = veryLargeDistance;
    } else {
      downDist = this.getTestDistance(DOWN, targetPacman);
    }
    this.dir = currDir;
    minDist = Math.min(Math.min(leftDist, rightDist), Math.min(upDist, downDist));
    switch (minDist) {
      case leftDist:
        this.dir = LEFT;
        break;

      case rightDist:
        this.dir = RIGHT;
        break;

      case upDist:
        this.dir = UP;
        break;

      case downDist:
        this.dir = DOWN;
        break;
    }
    this.moveOneStep();
  }

  public getTestDistance(dir, targetPacman) {
    let toReturn = 0;
    this.dir = dir;
    this.moveOneStep();
    if (targetPacman) {
      toReturn = Math.sqrt(Math.pow((this.x - mrPacman.x), 2) + Math.pow(this.y - mrPacman.y, 2));
    } else {
      switch (mrPacman.dir) {
        case LEFT:
          toReturn = Math.sqrt(Math.pow((this.x - (mrPacman.x - 4 * GRID_WIDTH)), 2) + Math.pow(this.y - mrPacman.y, 2));
          break;

        case RIGHT:
          toReturn = Math.sqrt(Math.pow((this.x - (mrPacman.x + 4 * GRID_WIDTH)), 2) + Math.pow(this.y - mrPacman.y, 2));
          break;

        case UP:
          toReturn = Math.sqrt(Math.pow((this.x - mrPacman.x), 2) + Math.pow(this.y - (mrPacman.y - 4 * GRID_HEIGHT), 2));
          break;

        case DOWN:
          toReturn = Math.sqrt(Math.pow((this.x - mrPacman.x), 2) + Math.pow(this.y - (mrPacman.y + 4 * GRID_HEIGHT), 2));
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
    this.gridType = gridType === undefined ? EMPTY_GRID : gridType;
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

  public draw() {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(this.x, this.y, GRID_WIDTH, GRID_HEIGHT);
    const gridType = this.gridType;
    if (gridType === undefined || gridType === EMPTY_GRID) {
      this.drawBean();
      return;
    }

    switch (gridType) {

      case LEFT_ONLY:
        this.addLeftEdge();
        break;

      case RIGHT_ONLY:
        this.addRightEdge();
        break;

      case TOP_ONLY:
        this.addTopEdge();
        break;

      case BOTTOM_ONLY:
        this.addBottomEdge();
        break;

      case LEFT_RIGHT:
        this.addLeftEdge();
        this.addRightEdge();
        break;

      case LEFT_TOP:
        this.addLeftEdge();
        this.addTopEdge();
        break;

      case LEFT_BOTTOM:
        this.addLeftEdge();
        this.addBottomEdge();
        break;

      case RIGHT_TOP:
        this.addRightEdge();
        this.addTopEdge();
        break;

      case RIGHT_BOTTOM:
        this.addRightEdge();
        this.addBottomEdge();
        break;

      case TOP_BOTTOM:
        this.addTopEdge();
        this.addBottomEdge();
        break;

      case CROSS_RD:
        this.makeCrossRoad();
        break;

      case LEFT_TOP_RIGHT:
        this.addLeftEdge();
        this.addTopEdge();
        this.addRightEdge();
        break;

      case TOP_RIGHT_BOTTOM:
        this.addTopEdge();
        this.addRightEdge();
        this.addBottomEdge();
        break;

      case RIGHT_BOTTOM_LEFT:
        this.addRightEdge();
        this.addBottomEdge();
        this.addLeftEdge();
        break;

      case BOTTOM_LEFT_TOP:
        this.addBottomEdge();
        this.addLeftEdge();
        this.addTopEdge();
        break;

      case CLOSED_GRID:
        this.addLeftEdge();
        this.addTopEdge();
        this.addBottomEdge();
        this.addRightEdge();
        break;

      default:
        break;
    }
    this.drawBean();
  }

  public addLeftEdge() {
    ctx.fillStyle = BORDER_COLOR;
    ctx.fillRect(this.x, this.y, WALL_WIDTH, GRID_HEIGHT);
  }

  public addRightEdge() {
    ctx.fillStyle = BORDER_COLOR;
    ctx.fillRect(this.x + GRID_WIDTH - WALL_WIDTH, this.y, WALL_WIDTH, GRID_HEIGHT);
  }

  public addTopEdge() {
    ctx.fillStyle = BORDER_COLOR;
    ctx.fillRect(this.x, this.y, GRID_WIDTH, WALL_WIDTH);
  }

  public addBottomEdge() {
    ctx.fillStyle = BORDER_COLOR;
    ctx.fillRect(this.x, this.y + GRID_HEIGHT - WALL_WIDTH, GRID_WIDTH, WALL_WIDTH);
  }

  public makeCrossRoad() {
    ctx.fillStyle = BORDER_COLOR;
    ctx.fillRect(this.x, this.y, WALL_WIDTH, WALL_WIDTH);
    ctx.fillRect(this.x + GRID_WIDTH - WALL_WIDTH, this.y, WALL_WIDTH, WALL_WIDTH);
    ctx.fillRect(this.x, this.y + GRID_HEIGHT - WALL_WIDTH, WALL_WIDTH, WALL_WIDTH);
    ctx.fillRect(this.x + GRID_WIDTH - WALL_WIDTH, this.y + GRID_HEIGHT - WALL_WIDTH, WALL_WIDTH, WALL_WIDTH);
  }

  public drawBean() {
    const beanType = this.beanType;
    const centerX = this.x + GRID_WIDTH / 2;
    const centerY = this.y + GRID_HEIGHT / 2;

    ctx.fillStyle = BEAN_COLOR;
    if (beanType === undefined) {
      return;
    }

    if (beanType === NORMAL_BEAN) {
      circle(ctx, centerX, centerY, NORMAL_BEAN_RADIUS);
    } else if (beanType === POWER_BEAN) {
      circle(ctx, centerX, centerY, POWER_BEAN_RADIUS);
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
    case UP:
      return DOWN;

    case DOWN:
      return UP;

    case LEFT:
      return RIGHT;

    case RIGHT:
      return LEFT;

    default:
      return -1; //err
  }
}

function getRowIndex(yCord) {
  if (yCord === undefined) {
    return -1; //err
  }
  return Math.floor(yCord / GRID_HEIGHT);
}

function getColIndex(xCord) {
  if (xCord === undefined) {
    return -1; //err
  }
  return Math.floor(xCord / GRID_WIDTH);
}

function canMove(x, y, dir) {
  if (!onGridCenter(x, y)) {
    return true;
  }
  let canMove_ = false;
  const currGrid = maze[getRowIndex(y)][getColIndex(x)];
  const gridType = currGrid.gridType;
  switch (dir) {
    case UP:
      if (gridType != LEFT_TOP && gridType != RIGHT_TOP && gridType != TOP_BOTTOM &&
        gridType != TOP_ONLY && gridType != LEFT_TOP_RIGHT &&
        gridType != TOP_RIGHT_BOTTOM && gridType != BOTTOM_LEFT_TOP) {
        canMove_ = true;
      }
      break;

    case DOWN:
      if (gridType != LEFT_BOTTOM && gridType != TOP_BOTTOM && gridType != RIGHT_BOTTOM &&
        gridType != BOTTOM_ONLY && gridType != RIGHT_BOTTOM_LEFT &&
        gridType != BOTTOM_LEFT_TOP && gridType != TOP_RIGHT_BOTTOM) {
        canMove_ = true;
      }
      break;

    case LEFT:
      if (gridType != LEFT_BOTTOM && gridType != LEFT_TOP && gridType != LEFT_ONLY &&
        gridType != LEFT_RIGHT && gridType != LEFT_TOP_RIGHT &&
        gridType != BOTTOM_LEFT_TOP && gridType != RIGHT_BOTTOM_LEFT) {
        canMove_ = true;
      }
      break;

    case RIGHT:
      if (gridType != RIGHT_BOTTOM && gridType != RIGHT_TOP && gridType != RIGHT_ONLY &&
        gridType != LEFT_RIGHT && gridType != RIGHT_BOTTOM_LEFT &&
        gridType != TOP_RIGHT_BOTTOM && gridType != LEFT_TOP_RIGHT) {
        canMove_ = true;
      }
      break;
    default:
      break;
  }
  return canMove_;
}

function onGridCenter(x, y) {
  return xOnGridCenter(y) && yOnGridCenter(x);
}

function xOnGridCenter(y) {
  return ((y - GRID_WIDTH / 2) % GRID_WIDTH) === 0;
}

function yOnGridCenter(x) {
  return ((x - GRID_HEIGHT / 2) % GRID_HEIGHT) === 0;
}

/*=================Run Methods================*/
function initMaze() {
  for (let i = 0; i < maze.length; i++) {
    const oneRow = new Array(CANVAS_WIDTH / GRID_WIDTH);
    maze[i] = oneRow;
  }

  // draw maze with full beans
  for (let row = 0; row < CANVAS_HEIGHT / GRID_HEIGHT; row++) {
    for (let col = 0; col < CANVAS_WIDTH / GRID_WIDTH; col++) {
      const beanType = NORMAL_BEAN;
      const newGrid = new Grid(col * GRID_WIDTH, row * GRID_HEIGHT, mazeContent[row][col], beanType);

      maze[row][col] = newGrid;
      newGrid.draw();
    }
  }

  //overwrite beans that shouldn't ecist
  for (let i = 0; i < noBean.length; i++) {
    const x = noBean[i][0];
    const y = noBean[i][1];
    maze[x][y].beanType = undefined;
    maze[x][y].draw();
  }

  // draw power beans
  for (let i = 0; i < powerBeans.length; i++) {
    const x = powerBeans[i][0];
    const y = powerBeans[i][1];
    maze[x][y].beanType = POWER_BEAN;
    maze[x][y].draw();
  }
}

function showScore() {
  ctx.fillStyle = 'black';
  ctx.fillRect(CANVAS_WIDTH - 250, 10, 190, 40);
  ctx.fillStyle = 'white';
  ctx.font = '24px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('score: ' + Math.floor(score), CANVAS_WIDTH - 250, 37);
}

function showLives() {
  ctx.fillStyle = 'black';
  ctx.fillRect(CANVAS_WIDTH - 80, 10, 70, 30);
  for (let i = 0; i < life - 1; i++) {
    lives[i] = new Pacman(CANVAS_WIDTH - 50 + 25 * i, 30, RIGHT);
    lives[i].draw();
  }
}

function printInstruction() {
  ctx.fillStyle = 'white';
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';

  const txt = 'WELCOME TO \nPACMAN 15-237!\n\n\nArrow keys or\nWASD to move\n\nQ to pause\nE to resume\nR to restart';
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

function gameOver() {
  for (let i = 0; i < ghosts.length; i++) {
    if (Math.abs(mrPacman.x - ghosts[i].x) <= 5 && Math.abs(mrPacman.y - ghosts[i].y) <= 5 &&
      !ghosts[i].isWeak) {
      return true;
    }
  }
  return false;
}

function staticArrayContains(cord) {
  const x = cord[0];
  const y = cord[1];
  for (let i = 0; i < staticGrids.length; i++) {
    if (x === staticGrids[i][0] &&
      y === staticGrids[i][1]) {
      return true;
    }
  }
  return false;
}

function sleep(ms) {
  const dt = new Date();
  dt.setTime(dt.getTime() + ms);
  while (new Date().getTime() < dt.getTime()) {  }
}

function fixGrids(x, y) {
  const row = getRowIndex(y);
  const col = getColIndex(x);

  if (xOnGridCenter(y)) {
    maze[row][col].draw();
    if (col + 1 < maze.length && !staticArrayContains([row, col + 1])) {
      maze[row][col + 1].draw();
    }
    if (col - 1 >= 0 && !staticArrayContains([row, col - 1])) {
      maze[row][col - 1].draw();
    }
  } else if (yOnGridCenter(x)) {
    maze[row][col].draw();
    if (row + 1 < maze.length && !staticArrayContains([row + 1, col])) {
      maze[row + 1][col].draw();
    }
    if (row - 1 >= 0 && !staticArrayContains([row - 1, col])) {
      maze[row - 1][col].draw();
    }
  }
}

function loseMessage() {
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

function pacmanWon() {
  return beansLeft === 0;
}

function winMessage() {
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

function eatBean() {
  if (onGridCenter(mrPacman.x, mrPacman.y)) {
    if (maze[mrPacman.getRow()][mrPacman.getCol()].beanType === NORMAL_BEAN) {
      score += 10; //modified
      showScore();
      beansLeft--;
    } else if (maze[mrPacman.getRow()][mrPacman.getCol()].beanType === POWER_BEAN) {
      score += 50; //modified
      showScore();
      beansLeft--;

      //ghosts enter weak mode
      for (let i = 0; i < ghosts.length; i++) {
        ghosts[i].isWeak = true;
      }
      weakCounter = WEAK_DURATION;
    }
    maze[mrPacman.getRow()][mrPacman.getCol()].beanType = undefined;
    maze[mrPacman.getRow()][mrPacman.getCol()].draw();
  }
}

function eatGhost() {
  for (let i = 0; i < ghosts.length; i++) {
    if (Math.abs(mrPacman.x - ghosts[i].x) <= 5 && Math.abs(mrPacman.y - ghosts[i].y) <= 5 &&
      ghosts[i].isWeak && !ghosts[i].isDead) {
      score += Math.floor(weakBonus);
      weakBonus *= 2;
      showScore();
      ghosts[i].isDead = true;
      ghosts[i].toGhostHouse();
    }
  }
}

function updateCanvas() {
  restartTimer++;
  if (gameOver() === true) {
    life--;
    // mrPacman.dieAnimation();
    showLives(); // show lives on top right corner
    if (life > 0) {
      sleep(500);
      clearInterval(intervalId); // 刷新
      fixGrids(mrPacman.x, mrPacman.y);
      for (let i = 0; i < ghosts.length; i++) {
        fixGrids(ghosts[i].x, ghosts[i].y);
      }
      run();
    } else {
      clearInterval(intervalId);
      sleep(500);
      loseMessage();
    }
  } else if (pacmanWon() === true) {
    clearInterval(intervalId);
    sleep(500);
    winMessage();
  } else { //正常游戏
    if (weakCounter > 0 && weakCounter < 2000 / timerDelay) { //weakcounter: ghosts in weak
      for (let i = 0; i < ghosts.length; i++) {
        ghosts[i].isBlinking = !ghosts[i].isBlinking;
      }
    }
    if (weakCounter > 0) {
      weakCounter--;
    }
    if (weakCounter === 0) {
      for (let i = 0; i < ghosts.length; i++) {
        ghosts[i].isDead = false;
        ghosts[i].isWeak = false;
        ghosts[i].isBlinking = false;
        weakBonus = 200;
      }
    }

    eatBean();
    eatGhost();
    mrPacman.move();

    for (let i = 0; i < ghosts.length; i++) {
      if (ghosts[i].isDead === false) {
        ghosts[i].move();
      }
    }

    fixGrids(mrPacman.x, mrPacman.y);
    for (let i = 0; i < ghosts.length; i++) {
      fixGrids(ghosts[i].x, ghosts[i].y);
    }

    mrPacman.draw();
    for (let i = 0; i < ghosts.length; i++) {
      ghosts[i].draw();
    }
  }
}

function countDown() {
  ctx.fillStyle = 'black';
  ctx.fillRect(CANVAS_HEIGHT - 85, 70, 80, 80);
  ctx.fillStyle = 'red';
  ctx.font = '50px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('3', CANVAS_HEIGHT - 43, 130);
  setTimeout(function() {
    ctx.fillStyle = 'black';
    ctx.fillRect(CANVAS_HEIGHT - 85, 70, 80, 80);
    ctx.fillStyle = 'orange';
    ctx.fillText('2', CANVAS_HEIGHT - 43, 130);
    setTimeout(function() {
      ctx.fillStyle = 'black';
      ctx.fillRect(CANVAS_HEIGHT - 85, 70, 80, 80);
      ctx.fillStyle = 'yellow';
      ctx.fillText('1', CANVAS_HEIGHT - 43, 130);
      setTimeout(function() {
        ctx.fillStyle = 'black';
        ctx.fillRect(CANVAS_HEIGHT - 85, 70, 80, 80);
        ctx.fillStyle = 'green';
        ctx.textAlign = 'center';
        ctx.fillText('GO', CANVAS_HEIGHT - 43, 130);
        setTimeout(function() {
          intervalId = setInterval(updateCanvas, timerDelay);
        },         500);
      },         1000);
    },         1000);
  },         1000);
}

function run(isGodMode = false) {
  showScore();

  mrPacman = new Pacman(pacmanStartLoc[1] * GRID_WIDTH + GRID_WIDTH / 2, pacmanStartLoc[0] * GRID_HEIGHT + GRID_HEIGHT / 2, RIGHT);
  if (!isGodMode) {
    blinky = new Ghost(0, 0, RED, DOWN);
    inky = new Ghost(0, 0, CYAN, DOWN);
    pinky = new Ghost(0, 0, PINK, DOWN);
    clyde = new Ghost(0, 0, ORANGE, DOWN);

    blinky.toGhostHouse();
    inky.toGhostHouse();
    pinky.toGhostHouse();
    clyde.toGhostHouse();

    ghosts = [blinky, inky, pinky, clyde];

    inky.draw();
    blinky.draw();
    pinky.draw();
    clyde.draw();
  } else {
    ghosts = [];
  }
  showLives();
  printInstruction();

  mrPacman.draw();
  countDown();
}

function updateWelcomeScreen() {
  ctx.fillStyle = 'black';
  ctx.fillRect(0, CANVAS_HEIGHT / 2, CANVAS_WIDTH, 140);
  welcomePacman.mouthOpen = !welcomePacman.mouthOpen;
  welcomeBlinky.isMoving = !welcomeBlinky.isMoving;
  welcomeInky.isMoving = !welcomeInky.isMoving;
  welcomePacman.draw();
  welcomeInky.draw();
  welcomeBlinky.draw();
}

export function initFields() {
  // body...
  for (let i = 6; i < 10; i++) {
    ghostHouse[ghostHouseIndex] = [i, 9];
    ghostHouseIndex++;
  }

  //fill up staticGrids[]
  for (let i = 0; i < 2; i++) {
    for (let j = 8; j < 17; j++) {
      staticGrids[staticGridsIndex] = [i, j];
      staticGridsIndex++;
    }
  }
  for (let i = 9; i < 17; i++) {
    for (let j = 0; j < 4; j++) {
      staticGrids[staticGridsIndex] = [i, j];
      staticGridsIndex++;
    }
  }
  for (let i = 2; i < 6; i++) {
    for (let j = 14; j < 17; j++) {
      staticGrids[staticGridsIndex] = [i, j];
      staticGridsIndex++;
    }
  }

  //fill up noBean[]
  for (let i = 0; i < 2; i++) {
    for (let j = 8; j < 17; j++) {
      noBean[noBeanIndex] = [i, j];
      noBeanIndex++;
    }
  }
  for (let i = 2; i < 6; i++) {
    for (let j = 14; j < 17; j++) {
      noBean[noBeanIndex] = [i, j];
      noBeanIndex++;
    }
  }
  for (let i = 9; i < 17; i++) {
    for (let j = 0; j < 4; j++) {
      noBean[noBeanIndex] = [i, j];
      noBeanIndex++;
    }
  }
  for (let i = 1; i < 6; i++) {
    noBean[noBeanIndex] = [i, 2];
    noBeanIndex++;
  }
  for (let i = 1; i < 4; i += 2) {
    for (let j = 4; j < 7; j++) {
      noBean[noBeanIndex] = [i, j];
      noBeanIndex++;
    }
  }
  for (let j = 8; j < 13; j++) {
    noBean[noBeanIndex] = [3, j];
    noBeanIndex++;
  }
  for (let j = 1; j < 7; j++) {
    noBean[noBeanIndex] = [7, j];
    noBeanIndex++;
  }
  for (let i = 5; i < 10; i++) {
    for (let j = 8; j < 11; j++) {
      noBean[noBeanIndex] = [i, j];
      noBeanIndex++;
    }
  }
  for (let j = 12; j < 16; j++) {
    noBean[noBeanIndex] = [7, j];
    noBeanIndex++;
  }
  for (let j = 12; j < 16; j++) {
    noBean[noBeanIndex] = [9, j];
    noBeanIndex++;
  }
  for (let i = 11; i < 16; i += 2) {
    for (let j = 5; j < 8; j++) {
      noBean[noBeanIndex] = [i, j];
      noBeanIndex++;
    }
  }
  for (let i = 11; i < 16; i += 2) {
    for (let j = 9; j < 12; j++) {
      noBean[noBeanIndex] = [i, j];
      noBeanIndex++;
    }
  }
  for (let j = 13; j < 16; j++) {
    noBean[noBeanIndex] = [11, j];
    noBeanIndex++;
  }
  for (let i = 12; i < 16; i++) {
    noBean[noBeanIndex] = [i, 15];
    noBeanIndex++;
  }
  for (let i = 13; i < 17; i++) {
    noBean[noBeanIndex] = [i, 13];
    noBeanIndex++;
  }
}

export function initCanvas(width, height, ctx_) {
  if (width === undefined || !(width instanceof Number)) {
    width = CANVAS_WIDTH;
  }
  if (height === undefined || !(height instanceof Number)) {
    height = CANVAS_HEIGHT;
  }

  ctx = ctx_;
  ctx_.fillStyle = 'black';
  ctx_.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

//listen to keyDown event
export function onKeyDown(event) {
  const keycode = event.keyCode;
  const pauseCode = 81; //q to pause
  const continueCode = 69; //e to resume
  const restartCode = 82; //r to restart
  const godModeCode = 71; //g to enter god mode

  // wasd
  const wCode = 87;
  const aCode = 65;
  const sCode = 83;
  const dCode = 68;
  //arrow keys
  const leftCode = 37;
  const upCode = 38;
  const rightCode = 39;
  const downCode = 40;

  //start game
  if (!gameOn) {
    if (keycode === sCode) {
      clearInterval(intervalId);
      gameOn = true;
      gamePaused = false;
      initMaze();
      run();
      return;
    } else if (keycode === godModeCode) {
      clearInterval(intervalId);
      ghosts = [];
      gameOn = true;
      gamePaused = false;
      initMaze();
      run(true);
      return;
    }
  } else {

    //pause game
    if (keycode === pauseCode && !gamePaused) {
      clearInterval(intervalId);
      gamePaused = true;
      return;
    }

    //resume game
    if (keycode === continueCode && gamePaused) {
      intervalId = setInterval(updateCanvas, timerDelay);
      gamePaused = false;
      return;
    }

    //restart game
    if (keycode === restartCode && restartTimer > 0) {
      //can't restart game if a game was just refreshed.
      restartTimer = 0;
      clearInterval(intervalId);
      gameOn = true;
      gamePaused = false;
      score = 0;
      life = MAX_LIFE;
      beansLeft = MAX_BEANS;
      initMaze();
      run();
    }

    //4-way controls
    switch (keycode) {
      case upCode:
      case wCode:
        mrPacman.nextDir = mrPacman.dir === UP ? undefined : UP;
        break;

      case rightCode:
      case dCode:
        mrPacman.nextDir = mrPacman.dir === RIGHT ? undefined : RIGHT;
        break;

      case leftCode:
      case aCode:
        mrPacman.nextDir = mrPacman.dir === LEFT ? undefined : LEFT;
        break;

      case downCode:
      case sCode:
        mrPacman.nextDir = mrPacman.dir === DOWN ? undefined : DOWN;
        break;

      default:
        break;
    }
  }
}

export function welcomeScreen() {
  gameOn = false;
  gamePaused = false;
  // welcome text
  ctx.fillStyle = 'white';
  ctx.font = '80px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('PACMAN', CANVAS_WIDTH / 2, 170);
  ctx.font = '20px monospace';
  ctx.fillText('Press s to start', CANVAS_WIDTH / 2, 220);
  ctx.font = '14px monospace';
  ctx.fillText('DEVELOPED BY: ZI WANG, BINGYING XIA', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 20 * 19);

  welcomePacman = new Pacman(CANVAS_WIDTH / 5, CANVAS_HEIGHT / 3 * 2, RIGHT);
  welcomePacman.radius = 30;
  welcomePacman.draw();

  welcomeBlinky = new Ghost(CANVAS_WIDTH / 5 * 3.3, CANVAS_HEIGHT / 3 * 2, RED, LEFT);
  welcomeBlinky.radius = 30;
  welcomeBlinky.draw();

  welcomeInky = new Ghost(CANVAS_WIDTH / 5 * 4, CANVAS_HEIGHT / 3 * 2, CYAN, RIGHT);
  welcomeInky.radius = 30;
  welcomeInky.draw();
  intervalId = setInterval(updateWelcomeScreen, timerDelay * 2);
}
