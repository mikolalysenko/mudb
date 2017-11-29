import { StateSchema, MsgSchema, RpcSchema } from './schema';
import { MuClient } from 'mudb/client';
import { MuClientState } from 'mustate/client';
import { Map, Player, Flag, Team, Direction, Config } from './game';
import { MuRPCClient } from 'murpc/client';

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

      rpcProtocol.server.rpc.joinTeam(client.sessionId, (err, teamGroup) => {
        const initx = getRandomInt(10, canvas.width - 10);
        const inity = (teamGroup === Team.top) ? 10 : canvas.height - 10;
        myPlayer = new Player(initx, inity, teamGroup);
        map.draw(ctx);
        myPlayer.draw(ctx);
        updateState();
        drawFlags();

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

    },
  });

  rpcProtocol.configure({
    rpc: {
      joinTeam: (arg, next) => { },
    },
  });

  client.start();

  function updateCanvas() {
    if (!ctx) { return; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // draw map
    map.draw(ctx);

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

    drawFlags();

    // move local player
    myPlayer.move(ctx);

    // update local player states
    updateState();

    raf = window.requestAnimationFrame(updateCanvas);
  }

  function updateState() {
    stateProtocol.state.team = myPlayer.team;
    stateProtocol.state.x = myPlayer.x;
    stateProtocol.state.y = myPlayer.y;
    stateProtocol.commit();
  }

  function drawFlags() {
    for (let i = 0; i < stateProtocol.server.state.flag.length; i++) {
      const {x, y, team}  = stateProtocol.server.state.flag[i];
      const flag = new Flag(x, y, team);
      flag.draw(ctx);
    }
  }

  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }
};
