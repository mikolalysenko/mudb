import { StateSchema, DBSchema } from './schema';
import { MuClient } from 'mudb/client';
import { MuClientState } from 'mustate/client';
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
  initMaze,
  showScore,
  showLives,
  printInstruction,
  eatBean,
  eatGhost,
  winMessage,
  pacmanWon,
  sleep,
  loseMessage,
  gameOver,
  fixGrids,
  welcomeScreen,
  initFields,
  initCanvas,
} from './pac';
import { isDate } from 'util';
import { isWorker } from 'cluster';

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

  const stateProtocol = new MuClientState({
    schema: StateSchema,
    client,
  });

  const dbProtocol = client.protocol(DBSchema);

  //spirtes instances
  let mrPacman:Pacman;
  let blinky;
  let inky;
  let pinky;
  let clyde;
  let ghosts:Ghost[];
  let weakCounter;
  let intervalId;
  let isGhostHoster = false;
  const pacman_color = getRandomColor();
  const ghostNumber = 4;

  stateProtocol.configure({
    ready: () => {
      initFields();
      initCanvas(CANVAS_WIDTH, CANVAS_HEIGHT, ctx);
      canvas.addEventListener('keydown', onKeyDown, false);
      canvas.setAttribute('tabindex', '0');
      canvas.focus();
      welcomeScreen(ctx, intervalId, pacman_color);
      for (let i = 0; i < ghostNumber; i++) {
        stateProtocol.state.ghosts[i] = {} as {x:number, y:number, color:string, dir:number, isWeak:boolean, isBlinking:boolean, isDead:boolean};
      }
    },
  });

  dbProtocol.configure({
    message: {
      ghostHoster: (id) => {
        console.log('get message:', id);
        if (id === client.sessionId || id === '') {
          console.log('is hoster');
          isGhostHoster = true;
        } else {
          isGhostHoster = false;
        }
      },
    },
  });

  function updateCanvas() {
    const spacman = stateProtocol.server.state.pacman;
    const sghosts = stateProtocol.server.state.ghosts;

    // -------- roles move -------- //
    mrPacman.move();
    if (isGhostHoster) {
      ghosts.forEach((ghost) => {
        ghost.move(mrPacman, weakCounter);
      });
    }

    // -------- update data -------- //
    updatePacman();
    if (isGhostHoster) { updateGhosts(); }
    stateProtocol.commit();

    // -------- fixGrids -------- //
    fixGrids(mrPacman.x, mrPacman.y, ctx);
    Object.keys(spacman).forEach((clientId) => {
      if (clientId !== client.sessionId) {
        const {x, y} = spacman[clientId];
        fixGrids(x, y, ctx);
      }
    });
    if (isGhostHoster) {
      ghosts.forEach((ghost) => {
        fixGrids(ghost.x, ghost.y, ctx);
      });
    } else {
      sghosts.forEach((ghost_data) => {
        const {x, y} = ghost_data;
        fixGrids(x, y, ctx);
      });
    }

    // -------- draw roles -------- //
    mrPacman.draw(ctx);
    Object.keys(spacman).forEach((clientId) => {
      if (clientId !== client.sessionId) {
        const {x, y, color, dir, mouthOpen, isLive} = spacman[clientId];
        if (isLive) {
          const remotePacman = new Pacman(x, y, color, dir, mouthOpen);
          remotePacman.draw(ctx);
        }
      }
    });
    if (isGhostHoster) {
      ghosts.forEach((ghost) => {
        ghost.draw(ctx);
      });
    } else {
      ghosts = [];
      sghosts.forEach((ghost_data) => {
        const {x, y, color, dir, isWeak, isBlinking, isDead} = ghost_data;
        const ghost = new Ghost(x, y, color, dir, isWeak, isBlinking, isDead);
        ghost.draw(ctx);
        ghosts.push(ghost);
      });
    }
  }

  function updateGhosts() {
    for (let i = 0; i < ghosts.length; i++) {
      stateProtocol.state.ghosts[i]['x'] = ghosts[i].x;
      stateProtocol.state.ghosts[i]['y'] = ghosts[i].y;
      stateProtocol.state.ghosts[i]['color'] = ghosts[i].color;
      stateProtocol.state.ghosts[i]['dir'] = ghosts[i].dir;
      stateProtocol.state.ghosts[i]['isWeak'] = ghosts[i].isWeak;
      stateProtocol.state.ghosts[i]['isBlinking'] = ghosts[i].isBlinking;
      stateProtocol.state.ghosts[i]['isDead'] = ghosts[i].isDead;
    }
  }

  function updatePacman() {
    stateProtocol.state.pacman.x = mrPacman.x;
    stateProtocol.state.pacman.y = mrPacman.y;
    stateProtocol.state.pacman.dir = mrPacman.dir;
    stateProtocol.state.pacman.mouthOpen = mrPacman.mouthOpen;
    stateProtocol.state.pacman.color = mrPacman.color;
  }

  client.start();

  /*=================Pacman Run Methods================*/
  function run(isGodMode = false) {
    showScore(ctx);

    mrPacman = new Pacman(GLOBAL['pacmanStartLoc'][1] * GLOBAL['GRID_WIDTH'] + GLOBAL['GRID_WIDTH'] / 2, GLOBAL['pacmanStartLoc'][0] * GLOBAL['GRID_HEIGHT'] + GLOBAL['GRID_HEIGHT'] / 2, pacman_color, GLOBAL['right']);
    // only generate ghosts when the it is the only one client in server
    if (!isGodMode && isGhostHoster) {
      blinky = new Ghost(0, 0, GLOBAL['red'], GLOBAL['down']);
      inky = new Ghost(0, 0, GLOBAL['cyan'], GLOBAL['down']);
      pinky = new Ghost(0, 0, GLOBAL['pink'], GLOBAL['down']);
      clyde = new Ghost(0, 0, GLOBAL['orange'], GLOBAL['down']);

      blinky.toGhostHouse();
      inky.toGhostHouse();
      pinky.toGhostHouse();
      clyde.toGhostHouse();

      ghosts = [blinky, inky, pinky, clyde];

      blinky.draw(ctx);
      inky.draw(ctx);
      pinky.draw(ctx);
      clyde.draw(ctx);

      updateGhosts();
      stateProtocol.state.pacman.isLive = true;
      stateProtocol.commit();
      dbProtocol.server.message.isGhostHoster(isGhostHoster);
    } else {
      ghosts = [];
    }

    showLives(ctx, pacman_color);
    printInstruction(ctx, ghosts);

    mrPacman.draw(ctx);
    countDown();
  }

  function runningLogic() {
    GLOBAL['restartTimer']++;
    if (gameOver(mrPacman, ghosts) === true) {
      console.log('gameover');
      clearInterval(intervalId); // refresh
      stateProtocol.state.pacman.isLive = false;
      isGhostHoster = false;
      stateProtocol.commit();

      GLOBAL['life']--;
      // mrPacman.dieAnimation();
      showLives(ctx, pacman_color); // show lives on top right orner
      if (GLOBAL['life'] > 0) {
        fixGrids(mrPacman.x, mrPacman.y, ctx);
        for (let i = 0; i < ghosts.length; i++) {
          fixGrids(ghosts[i].x, ghosts[i].y, ctx);
        }
        setTimeout(run, 500);
      } else {
        sleep(500);
        loseMessage(ctx);
      }
    } else if (pacmanWon() === true) {
      clearInterval(intervalId);
      stateProtocol.state.pacman.isLive = false;
      stateProtocol.commit();
      sleep(500);
      winMessage(ctx);
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
      eatBean(ctx, mrPacman, ghosts, weakCounter);
      eatGhost(ctx, mrPacman, ghosts);
      updateCanvas();
    }
  }

  function getRandomColor() : string {
    const letters = 'BCDEF'.split('');
    let color = '#';
    for (let i = 0; i < 6; i++ ) {
        color += letters[Math.floor(Math.random() * letters.length)];
    }
    return color;
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
            stateProtocol.state.pacman.isLive = true;
            stateProtocol.commit();
            intervalId = setInterval(runningLogic, GLOBAL['timerDelay']);
          },         500);
        },         1000);
      },         1000);
    },         1000);
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
        initMaze(ctx);
        run();
        return;
      // } else if (keycode === godModeCode) {
      //   clearInterval(intervalId);
      //   ghosts = [];
      //   GLOBAL['gameOn'] = true;
      //   GLOBAL['gamePaused'] = false;
      //   initMaze(ctx);
      //   run(true);
      //   return;
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
        intervalId = setInterval(runningLogic, GLOBAL['timerDelay']);
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
        initMaze(ctx);
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
};
