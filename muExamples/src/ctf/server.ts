import { StateSchema, MsgSchema, RpcSchema } from './schema';
import { MuServer } from 'mudb/server';
import { MuServerState } from 'mustate/server';
import { MuRPCServer } from 'murpc/server';
import { Team, Config } from './game';
import { endianness } from 'os';
import { log } from 'util';

export = function(server:MuServer) {
  const stateProtocol = new MuServerState({
    schema: StateSchema,
    server,
    windowSize: 0,
  });
  const msgProtocol = server.protocol(MsgSchema);
  const rpcProtocol = new MuRPCServer(server, RpcSchema);

  type TeamStruct = {
    'players':string[],
    'flags':{x:number, y:number, team:number}[],
  };
  const teamTop:TeamStruct = {players:[], flags:[]};
  const teamBottom:TeamStruct = {players:[], flags:[]};
  const capFlag:{[playerId:string]:number} = {};

  stateProtocol.configure({
    state: (client, {team, x, y}) => {
      stateProtocol.state.player[client.sessionId] = {team, x, y};
      const enermyTeam = (team === Team.top) ? teamBottom : teamTop;

      // if this player hold a flag, update this flag
      updateCapFlag(client.sessionId, x, y, enermyTeam);

      // player can only hold one flag
      if (Object.keys(capFlag).indexOf(client.sessionId) === -1) {
        // if touchs enermy's flag
        for (let i = 0; i < enermyTeam.flags.length; i++) {
          // any board of the player touchs the flag
          if (x <= enermyTeam.flags[i]['x'] + Config.player_size &&
              x >= enermyTeam.flags[i]['x'] - Config.player_size &&
              y <= enermyTeam.flags[i]['y'] + Config.player_size &&
              y >= enermyTeam.flags[i]['y'] - Config.player_size) {
            capFlag[client.sessionId] = i;
            updateCapFlag(client.sessionId, x, y, enermyTeam);
          }
        }
      }

      // if touchs enermy
      // TODO:

      updateStateFlag();
      stateProtocol.commit();
    },
    connect: (client) => {
      console.log(client.sessionId, 'joined');

      // when the first player joined, init flags
      if (Object.keys(stateProtocol.state.player).length === 0) {
        initFlags(3); //init flag number set to 3
        updateStateFlag();
        stateProtocol.commit();
      }
    },
    disconnect: (client) => {
      console.log(client.sessionId, 'left');

      const team = stateProtocol.state.player[client.sessionId]['team'];
      delete stateProtocol.state.player[client.sessionId];
      stateProtocol.commit();

      // delete the player
      const hisTeam = (team === Team.top) ? teamTop : teamBottom;
      const index = hisTeam.players.indexOf(client.sessionId);
      if (index > -1) {
        hisTeam.players.slice(index, 1);
      } else {
        console.log('cannot find', client.sessionId);
      }
    },
  });

  msgProtocol.configure({
    message: {

    },
  });

  rpcProtocol.configure({
    rpc: {
      joinTeam: (arg, next) => {
        if (teamTop.players.length < teamBottom.players.length) {
          teamTop.players.push(arg);
          next(undefined, Team.top);
        } else {
          teamBottom.players.push(arg);
          next(undefined, Team.bottom);
        }
      },
    },
  });

  server.start();

  function updateCapFlag(clientId, x, y, enermyTeam) {
    const capFlagIndex = Object.keys(capFlag).indexOf(clientId);
    if (capFlagIndex > -1) {
      enermyTeam.flags[capFlag[clientId]]['x'] = x;
      enermyTeam.flags[capFlag[clientId]]['y'] = y;
    }
  }

  function initFlags(flagNumber) {
    for (let i = 0; i < flagNumber; i++) {
      teamTop.flags.push({x: i * 200 + 80, y: 15, team:Team.top});
      teamBottom.flags.push({x: i * 200 + 80, y: Config.canvas_height, team:Team.bottom});
    }
    stateProtocol.state.flag = new Array(flagNumber * 2);
  }

  function updateStateFlag() {
    const flagNumber = stateProtocol.state.flag.length;
    for (let i = 0; i < flagNumber / 2; i++) {
      stateProtocol.state.flag[i] = teamTop.flags[i];
      stateProtocol.state.flag[i + flagNumber / 2] = teamBottom.flags[i];
    }
    console.log('capFlag', capFlag);
    console.log('teamBottom', teamBottom);
    console.log('state.flag', stateProtocol.state.flag);
  }
};
