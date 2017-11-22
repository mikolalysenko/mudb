import { GameSchema } from './schema';
import { MuClient } from 'mudb/client';
import { MuClientState } from '../../client';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GLOBAL,
  onGridCenter,
  maze,
  Grid,
  Ghost,
  Pacman,
  getRowIndex,
  getColIndex,
  xOnGridCenter,
  yOnGridCenter,
  mazeContent,
} from './pac';

export = function(client:MuClient) {
  const canvas = document.createElement('canvas');
  canvas.style.padding = '0px';
  canvas.style.margin = '0px';
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    document.body.innerText = 'canvas not supported';
    return;
  }

  const protocol = new MuClientState({
    schema: GameSchema,
    client,
  });

  //spirtes instances
  let welcomePacman;
  let welcomeBlinky;
  let welcomeInky;
  let mrPacman:Pacman;
  let blinky;
  let inky;
  let pinky;
  let clyde;
  let ghosts:Ghost[];
  let weakCounter;
  let intervalId;
  const pacman_color = getRandomColor();

  protocol.configure({
    ready: () => {
      initFields();
      initCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
      canvas.addEventListener('keydown', onKeyDown, false);
      canvas.setAttribute('tabindex', '0');
      canvas.focus();
      welcomeScreen();
    },
  });

  function updateProtocolState() {
    Object.keys(protocol.server.state).forEach((clientId) => {
      if (clientId !== client.sessionId) {
        const {x, y, color, dir, mouthOpen, isLive} = protocol.server.state[clientId];
        fixGrids(x, y);
        if (isLive) {
          const remotePacman = new Pacman(x, y, color, dir, mouthOpen);
          remotePacman.draw(ctx);
        }
      }
    });

    protocol.state.x = mrPacman.x;
    protocol.state.y = mrPacman.y;
    protocol.state.dir = mrPacman.dir;
    protocol.state.mouthOpen = mrPacman.mouthOpen;
    protocol.state.color = mrPacman.color;
    protocol.state.isLive = true;
    protocol.commit();
  }

  client.start();

  /*=================Pacman Run Methods================*/
  function run(isGodMode = false) {
    showScore();

    mrPacman = new Pacman(GLOBAL['pacmanStartLoc'][1] * GLOBAL['GRID_WIDTH'] + GLOBAL['GRID_WIDTH'] / 2, GLOBAL['pacmanStartLoc'][0] * GLOBAL['GRID_HEIGHT'] + GLOBAL['GRID_HEIGHT'] / 2, pacman_color, GLOBAL['right']);
    if (!isGodMode) {
      blinky = new Ghost(0, 0, GLOBAL['red'], GLOBAL['down']);
      inky = new Ghost(0, 0, GLOBAL['cyan'], GLOBAL['down']);
      pinky = new Ghost(0, 0, GLOBAL['pink'], GLOBAL['down']);
      clyde = new Ghost(0, 0, GLOBAL['orange'], GLOBAL['down']);

      blinky.toGhostHouse();
      inky.toGhostHouse();
      pinky.toGhostHouse();
      clyde.toGhostHouse();

      ghosts = [blinky, inky, pinky, clyde];

      inky.draw(ctx);
      blinky.draw(ctx);
      pinky.draw(ctx);
      clyde.draw(ctx);
    } else {
      ghosts = [];
    }
    showLives();
    printInstruction();

    mrPacman.draw(ctx);
    countDown();
  }

  function updateCanvas() {
    GLOBAL['restartTimer']++;
    if (gameOver() === true) {
      protocol.state.isLive = false;
      protocol.commit();

      GLOBAL['life']--;
      // mrPacman.dieAnimation();
      showLives(); // show lives on top right corner
      if (GLOBAL['life'] > 0) {
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
      if (weakCounter > 0 && weakCounter < 2000 / GLOBAL['timerDelay']) { //weakcounter: ghosts in weak
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
          GLOBAL['weakBonus'] = 200;
        }
      }

      eatBean();
      eatGhost();
      mrPacman.move();

      for (let i = 0; i < ghosts.length; i++) {
        if (ghosts[i].isDead === false) {
          ghosts[i].move(mrPacman, weakCounter);
        }
      }

      fixGrids(mrPacman.x, mrPacman.y);
      for (let i = 0; i < ghosts.length; i++) {
        fixGrids(ghosts[i].x, ghosts[i].y);
      }

      mrPacman.draw(ctx);
      for (let i = 0; i < ghosts.length; i++) {
        ghosts[i].draw(ctx);
      }
    }
    updateProtocolState();
  }

  function getRandomColor() : string {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (var i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

  function initMaze() {
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

  function showScore() {
    if (!ctx) { return; }
    ctx.fillStyle = 'black';
    ctx.fillRect(CANVAS_WIDTH - 250, 10, 190, 40);
    ctx.fillStyle = 'white';
    ctx.font = '24px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('score: ' + Math.floor(GLOBAL['score']), CANVAS_WIDTH - 250, 37);
  }

  function showLives() {
    if (!ctx) { return; }
    ctx.fillStyle = 'black';
    ctx.fillRect(CANVAS_WIDTH - 80, 10, 70, 30);
    for (let i = 0; i < GLOBAL['life'] - 1; i++) {
      GLOBAL['lives'][i] = new Pacman(CANVAS_WIDTH - 50 + 25 * i, 30, pacman_color, GLOBAL['right']);
      GLOBAL['lives'][i].draw(ctx);
    }
  }

  function printInstruction() {
    if (!ctx) { return; }
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
    for (let i = 0; i < GLOBAL['staticGrids'].length; i++) {
      if (x === GLOBAL['staticGrids'][i][0] &&
        y === GLOBAL['staticGrids'][i][1]) {
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

  function loseMessage() {
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

  function pacmanWon() {
    return GLOBAL['beansLeft'] === 0;
  }

  function winMessage() {
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

  function eatBean() {
    if (onGridCenter(mrPacman.x, mrPacman.y)) {
      if (maze[mrPacman.getRow()][mrPacman.getCol()].beanType === GLOBAL['NORMAL_BEAN']) {
        GLOBAL['score'] += 10; //modified
        showScore();
        GLOBAL['beansLeft']--;
      } else if (maze[mrPacman.getRow()][mrPacman.getCol()].beanType === GLOBAL['POWER_BEAN']) {
        GLOBAL['score'] += 50; //modified
        showScore();
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

  function eatGhost() {
    for (let i = 0; i < ghosts.length; i++) {
      if (Math.abs(mrPacman.x - ghosts[i].x) <= 5 && Math.abs(mrPacman.y - ghosts[i].y) <= 5 &&
        ghosts[i].isWeak && !ghosts[i].isDead) {
        GLOBAL['score'] += Math.floor(GLOBAL['weakBonus']);
        GLOBAL['weakBonus'] *= 2;
        showScore();
        ghosts[i].isDead = true;
        ghosts[i].toGhostHouse();
      }
    }
  }

  function countDown() {
    if (!ctx) { return; }
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
            intervalId = setInterval(updateCanvas, GLOBAL['timerDelay']);
          },         500);
        },         1000);
      },         1000);
    },         1000);
  }

  function updateWelcomeScreen() {
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

  function initFields() {
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

  function initCanvas(width, height) {
    if (!ctx) { return; }
    if (width === undefined || !(width instanceof Number)) {
      width = CANVAS_WIDTH;
    }
    if (height === undefined || !(height instanceof Number)) {
      height = CANVAS_HEIGHT;
    }
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  //listen to keyDown event
  function onKeyDown(event) {
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
    if (!GLOBAL['gameOn']) {
      if (keycode === sCode) {
        clearInterval(intervalId);
        GLOBAL['gameOn'] = true;
        GLOBAL['gamePaused'] = false;
        initMaze();
        run();
        return;
      } else if (keycode === godModeCode) {
        clearInterval(intervalId);
        ghosts = [];
        GLOBAL['gameOn'] = true;
        GLOBAL['gamePaused'] = false;
        initMaze();
        run(true);
        return;
      }
    } else {

      //pause game
      if (keycode === pauseCode && !GLOBAL['gamePaused']) {
        clearInterval(intervalId);
        GLOBAL['gamePaused'] = true;
        return;
      }

      //resume game
      if (keycode === continueCode && GLOBAL['gamePaused']) {
        intervalId = setInterval(updateCanvas, GLOBAL['timerDelay']);
        GLOBAL['gamePaused'] = false;
        return;
      }

      //restart game
      if (keycode === restartCode && GLOBAL['restartTimer'] > 0) {
        //can't restart game if a game was just refreshed.
        GLOBAL['restartTimer'] = 0;
        clearInterval(intervalId);
        GLOBAL['gameOn'] = true;
        GLOBAL['gamePaused'] = false;
        GLOBAL['score'] = 0;
        GLOBAL['life'] = GLOBAL['MAX_LIFE'];
        GLOBAL['beansLeft'] = GLOBAL['MAX_BEANS'];
        initMaze();
        run();
      }

      //4-way controls
      switch (keycode) {
        case upCode:
        case wCode:
          mrPacman.nextDir = mrPacman.dir === GLOBAL['up'] ? undefined : GLOBAL['up'];
          break;

        case rightCode:
        case dCode:
          mrPacman.nextDir = mrPacman.dir === GLOBAL['right'] ? undefined : GLOBAL['right'];
          break;

        case leftCode:
        case aCode:
          mrPacman.nextDir = mrPacman.dir === GLOBAL['left'] ? undefined : GLOBAL['left'];
          break;

        case downCode:
        case sCode:
          mrPacman.nextDir = mrPacman.dir === GLOBAL['down'] ? undefined : GLOBAL['down'];
          break;

        default:
          break;
      }
    }
  }

  function welcomeScreen() {
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
    ctx.fillText('DEVELOPED BY: ZI WANG, BINGYING XIA', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 20 * 19);

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
};
