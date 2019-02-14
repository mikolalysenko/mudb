import { MuServer } from 'mudb/server';
import { MuServerState } from 'mudb/state/server';
import { MuRPCServer } from 'mudb/rpc/server';

import { StateSchema, MsgSchema, RpcSchema } from './schema';
import { Team, Config } from './game';

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
      const isHoldFlag = Object.keys(capFlag).indexOf(client.sessionId) > -1;
      const r = Config.player_size;

      if (!atHomeMap(team, y)) {
        if (!isHoldFlag) {
          for (let i = 0; i < teamdb[enermy].flags.length; i++) {
            // if player touchs the flag
            if (touchFlag(x, y, teamdb[enermy].flags[i])) {
              capFlag[client.sessionId] = i;
              updateCapFlag(client.sessionId, x, y, enermy);
            }
          }
        } else {
          // update the flag point to be same as the player
          updateCapFlag(client.sessionId, x, y, enermy);
        }

        // if touchs enermy, player dead and returns the flag
        for (let i = 0; i < teamdb[enermy].players.length; i++) {
          const enermyPlayer = stateProtocol.state.player[teamdb[enermy].players[i]];
          if (touchEnermy(x, y, enermyPlayer)) {
            msgProtocol.clients[client.sessionId].message.dead(client.sessionId);
            if (isHoldFlag) { returnFlag(client.sessionId, enermy); }
          }
        }
      } else if (isHoldFlag) {
        // win the score
        score[team] ++;
        msgProtocol.broadcast.score(score);
        returnFlag(client.sessionId, enermy);
      }

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

  function touchEnermy(x, y, enermyPlayer) {
    return (
      enermyPlayer &&
      x <= enermyPlayer.x + Config.player_size * 2 &&
      x >= enermyPlayer.x - Config.player_size * 2 &&
      y <= enermyPlayer.y + Config.player_size * 2 &&
      y >= enermyPlayer.y - Config.player_size * 2
    );
  }

  function touchFlag(x, y, flag) {
    return (
      x <= flag['x'] + Config.player_size &&
      x >= flag['x'] - Config.player_size &&
      y <= flag['y'] + Config.player_size &&
      y >= flag['y'] - Config.player_size
    );
  }

  function returnFlag(clientId, enermy) {
    const flagIndex = capFlag[clientId];
    delete capFlag[clientId];
    teamdb[enermy].flags[flagIndex] = getInitFlag(enermy, flagIndex);
    updateStateFlag();
  }

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
