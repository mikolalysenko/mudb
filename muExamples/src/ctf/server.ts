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
  const teamdb:TeamStruct[] = [{players:[], flags:[]}, {players:[], flags:[]}];
  const capFlag:{[playerId:string]:number} = {};
  const score = [0, 0];
  const flagNumber = 3;

  stateProtocol.configure({
    state: (client, {team, x, y}) => {
      stateProtocol.state.player[client.sessionId] = {team, x, y};
      const enermy = (team === Team.top) ? Team.bottom : Team.top;

      // player not holding a flag
      if (Object.keys(capFlag).indexOf(client.sessionId) === -1) {
        for (let i = 0; i < teamdb[enermy].flags.length; i++) {
          // if player touchs the flag
          if (x <= teamdb[enermy].flags[i]['x'] + Config.player_size &&
              x >= teamdb[enermy].flags[i]['x'] - Config.player_size &&
              y <= teamdb[enermy].flags[i]['y'] + Config.player_size &&
              y >= teamdb[enermy].flags[i]['y'] - Config.player_size) {
            capFlag[client.sessionId] = i;
            updateCapFlag(client.sessionId, x, y, enermy);
          }
        }
      } else {
        // when player hold the flag, let the flag position to same as this player
        updateCapFlag(client.sessionId, x, y, enermy);
        if (atHomeMap(team, y)) {
          score[team] ++;
          msgProtocol.broadcast.score(score);

          // init this flag
          const flagIndex = capFlag[client.sessionId];
          delete capFlag[client.sessionId];
          teamdb[enermy].flags[flagIndex] = getInitFlag(enermy, flagIndex);
          updateStateFlag();
        }
      }

      // if touchs enermy
      // TODO:

      stateProtocol.commit();
    },
    connect: (client) => {
      console.log(client.sessionId, 'joined');

      // when the first player joined, init flags
      if (Object.keys(stateProtocol.state.player).length === 0) {
        initFlags(); //init flag number set to 3
        stateProtocol.commit();
      }
    },
    disconnect: (client) => {
      console.log(client.sessionId, 'left');

      const team = stateProtocol.state.player[client.sessionId]['team'];
      delete stateProtocol.state.player[client.sessionId];
      stateProtocol.commit();

      // delete the player
      const index = teamdb[team].players.indexOf(client.sessionId);
      if (index > -1) {
        teamdb[team].players.slice(index, 1);
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
        if (teamdb[Team.top].players.length < teamdb[Team.bottom].players.length) {
          teamdb[Team.top].players.push(arg);
          next(undefined, Team.top);
        } else {
          teamdb[Team.bottom].players.push(arg);
          next(undefined, Team.bottom);
        }
      },
    },
  });

  server.start();

  function updateCapFlag(clientId, x, y, enermy) {
    teamdb[enermy].flags[capFlag[clientId]]['x'] = x;
    teamdb[enermy].flags[capFlag[clientId]]['y'] = y;
  }

  function initFlags() {
    for (let i = 0; i < flagNumber; i++) {
      teamdb[Team.top].flags[i] = getInitFlag(Team.top, i);
      teamdb[Team.bottom].flags[i] = getInitFlag(Team.bottom, i);
    }
    stateProtocol.state.flag = new Array(flagNumber * 2);

    for (let i = 0; i < flagNumber; i++) {
      stateProtocol.state.flag[i] = teamdb[Team.top].flags[i];
      stateProtocol.state.flag[i + flagNumber] = teamdb[Team.bottom].flags[i];
    }
  }

  function updateStateFlag() {
    for (let i = 0; i < flagNumber; i++) {
      stateProtocol.state.flag[i] = teamdb[Team.top].flags[i];
      stateProtocol.state.flag[i + flagNumber] = teamdb[Team.bottom].flags[i];
    }
  }

  function atHomeMap(team, y) {
    if (team === Team.top) { return y < Config.canvas_height / 2; }
    return y > Config.canvas_height / 2;
  }

  function getInitFlag(team, index) {
    const y = (team === Team.top) ? Config.flag_size : Config.canvas_height;
    const x = (index + 1) * Config.canvas_width / (flagNumber + 1);
    return {x, y, team};
  }
};
