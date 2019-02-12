import { MuClient } from 'mudb/client';
import { MuClientState } from 'mudb/state/client';
import { MuRPCClient } from 'mudb/rpc/client';

import { StateSchema, MsgSchema, RpcSchema } from './schema';
import { Map, Player, Flag, Team, Direction, Config } from './game';

export = function(client:MuClient) {
  const canvas = document.createElement('canvas');
  canvas.style.padding = '0px';
  canvas.style.margin = '0px';
  canvas.style.backgroundColor = 'black';
  canvas.width = Config.canvas_width;
  canvas.height = Config.canvas_height;
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
  const msgProtocol = client.protocol(MsgSchema);
  const rpcProtocol = new MuRPCClient(client, RpcSchema);

  const map = new Map(canvas.width, canvas.height);
  let myPlayer;
  let players = {};
  let raf;

  stateProtocol.configure({
    ready: () => {
      console.log(client.sessionId);

      rpcProtocol.server.rpc.joinTeam(client.sessionId, (teamGroup) => {
        const {x, y} = getInitPosition(teamGroup);
        myPlayer = new Player(x, y, teamGroup);
        runGame();

        document.addEventListener('keydown', function(e) {
          if (e.keyCode === 27) { // ESC
            window.cancelAnimationFrame(raf);
          } else { // start
            myPlayer.direction = e.keyCode;
          }
        });

        raf = window.requestAnimationFrame(updateCanvas);
      });
    },
  });

  msgProtocol.configure({
    message: {
      score: (score) => {
        map.score = score;
      },
      dead: (id) => {
        if (client.sessionId === id) {
          const {x, y} = getInitPosition(myPlayer.team);
          myPlayer.x = x;
          myPlayer.y = y;
          myPlayer.direction = undefined;
        }
      },
    },
  });

  rpcProtocol.configure({
    rpc: {
      joinTeam: (arg, next) => { },
    },
  });

  client.start();

  function runGame() {
    map.draw(ctx);

    // draw flags
    for (let i = 0; i < stateProtocol.server.state.flag.length; i++) {
      const {x, y, team}  = stateProtocol.server.state.flag[i];
      const flag = new Flag(x, y, team);
      flag.draw(ctx);
    }

    // draw remote players
    players = stateProtocol.server.state.player;
    const playerProps = Object.keys(players);
    for (let i = 0; i < playerProps.length; i++) {
      if (playerProps[i] !== client.sessionId) {
        const {x, y, team} = players[playerProps[i]];
        const player = new Player(x, y, team);
        player.draw(ctx);
      }
    }

    // move local player
    myPlayer.move(ctx);
    myPlayer.draw(ctx);

    // update state
    stateProtocol.state.team = myPlayer.team;
    stateProtocol.state.x = myPlayer.x;
    stateProtocol.state.y = myPlayer.y;
    stateProtocol.commit();
  }

  function updateCanvas() {
    if (!ctx) { return; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    runGame();
    raf = window.requestAnimationFrame(updateCanvas);
  }

  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  function getInitPosition(teamGroup) {
    return {
      x: getRandomInt(10, canvas.width - 10),
      y: (teamGroup === Team.top) ? 10 : canvas.height - 10,
    };
  }
};
