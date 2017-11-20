// game grid
export GRID_WIDTH = 30;
export GRID_HEIGHT = 30;
export WALL_WIDTH = 3;
export numRows = CANVAS_WIDTH / GRID_HEIGHT;
export numCols = CANVAS_HEIGHT / GRID_WIDTH;

// colors for UI & Pacman
export BG_COLOR = 'black';
export BORDER_COLOR = 'blue';
export BEAN_COLOR = 'white';
export PACMAN_COLOR = 'yellow';

// colors for ghost
export RED = 'red';
export PINK = '#ff9cce';
export CYAN = '#00ffde';
export ORANGE = '#ffb847';
export WEAK_COLOR = '#0031ff';
export BLINKING_COLOR = 'white';

// size of sprites
export NORMAL_BEAN_RADIUS = 2;
export POWER_BEAN_RADIUS = 5;
export PACMAN_RADIUS = 9;
export GHOST_RADIUS = 9;

// directions
export UP = 1;
export DOWN = 2;
export LEFT = 3;
export RIGHT = 4;

// game parameters
export intervalId;
export restartTimer = 0;
export timerDelay = 80;
export speed = 5;
export score = 0;
export lives = [];
export MAX_LIFE = 3;
export life = MAX_LIFE;
export weakBonus = 200;
export MAX_BEANS = 136;
export beansLeft = MAX_BEANS;
export weakCounter;
export WEAK_DURATION = 10000 / timerDelay;

//bean cases
export NORMAL_BEAN = 1;
export POWER_BEAN = 2;

//spirtes instances
export welcomePacman;
export welcomeBlinky;
export welcomeInky;
export mrPacman;
export blinky;
export inky;
export pinky;
export clyde;
export ghosts;

//game state and map
export gameOn = false;
export gamePaused = false;
export maze = new Array(CANVAS_HEIGHT / GRID_HEIGHT);
export mazeContent = [
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
export staticGrids = [];
export staticGridsIndex = 0;

// start location of pacman
export pacmanStartLoc = [4, 9];

// grids with no beans
export noBean = [pacmanStartLoc, [5, 12],
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
export noBeanIndex = noBean.length;

// power beans in maze
export powerBeans = [
  [0, 0],
  [2, 13],
  [16, 4],
  [16, 16],
  [2, 5],
  [14, 10],
];

// ghost house
export ghostHouse = [];
export ghostHouseIndex = 0;

export getRowIndex = function (yCord) {
    if (yCord === undefined) {
        return -1; //err
    }
    return parseInt(yCord / GRID_HEIGHT);
};

export getColIndex = function (xCord) {
    if (xCord === undefined) {
        return -1; //err
    }
    return parseInt(xCord / GRID_WIDTH);
};

export canMove = function (x, y, dir) {
    if (!onGridCenter(x, y)) {
        return true;
    }
    let canMove = false;
    const currGrid = maze[getRowIndex(y)][getColIndex(x)];
    const gridType = currGrid.gridType;
    switch (dir) {
        case UP:
            if (gridType != LEFT_TOP && gridType != RIGHT_TOP && gridType != TOP_BOTTOM &&
                gridType != TOP_ONLY && gridType != LEFT_TOP_RIGHT &&
                gridType != TOP_RIGHT_BOTTOM && gridType != BOTTOM_LEFT_TOP) {
                canMove = true;
            }
            break;

        case DOWN:
            if (gridType != LEFT_BOTTOM && gridType != TOP_BOTTOM && gridType != RIGHT_BOTTOM &&
                gridType != BOTTOM_ONLY && gridType != RIGHT_BOTTOM_LEFT &&
                gridType != BOTTOM_LEFT_TOP && gridType != TOP_RIGHT_BOTTOM) {
                canMove = true;
            }
            break;

        case LEFT:
            if (gridType != LEFT_BOTTOM && gridType != LEFT_TOP && gridType != LEFT_ONLY &&
                gridType != LEFT_RIGHT && gridType != LEFT_TOP_RIGHT &&
                gridType != BOTTOM_LEFT_TOP && gridType != RIGHT_BOTTOM_LEFT) {
                canMove = true;
            }
            break;

        case RIGHT:
            if (gridType != RIGHT_BOTTOM && gridType != RIGHT_TOP && gridType != RIGHT_ONLY &&
                gridType != LEFT_RIGHT && gridType != RIGHT_BOTTOM_LEFT &&
                gridType != TOP_RIGHT_BOTTOM && gridType != LEFT_TOP_RIGHT) {
                canMove = true;
            }
            break;
        default:
            break;

    }
    return canMove;
};
