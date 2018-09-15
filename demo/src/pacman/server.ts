import { StateSchema, DBSchema } from './schema';
import { MuServer } from 'mudb/server';
import {  MuServerState } from 'mustate/server';

export = function(server:MuServer) {
  const stateProtocol = new MuServerState({
    schema: StateSchema,
    server,
    windowSize: 0,
  });

  const dbProtocol = server.protocol(DBSchema);
  let ghostHoster:string = '';

  stateProtocol.configure({
    state: (client, {pacman, ghosts}) => {
      stateProtocol.state.pacman[client.sessionId] = pacman;

      if (ghostHoster === client.sessionId) {
        if (pacman.isLive) {
          ghostHoster = client.sessionId;
          stateProtocol.state.ghosts = ghosts;
        } else {
          console.log(client.sessionId, 'is dead');
          resetGhostHoster();
        }
      }
      stateProtocol.commit();
    },
    connect: (client) => {
      console.log('ghostHoster:', ghostHoster);
      dbProtocol.broadcast.ghostHoster(ghostHoster);
    },
    disconnect: (client) => {
      if (stateProtocol.state.pacman[client.sessionId]) {
        stateProtocol.state.pacman[client.sessionId]['isLive'] = false;
        if (ghostHoster === client.sessionId) {
          resetGhostHoster();
        }
        stateProtocol.commit();
        delete stateProtocol.state.pacman[client.sessionId];
      }
    },
  });

  dbProtocol.configure({
    message: {
      isGhostHoster: (client, isHoster) => {
        if (isHoster) {
          ghostHoster = client.sessionId;
          dbProtocol.broadcast.ghostHoster(ghostHoster);
        }
      },
    },
  });
  server.start();

  function getRandomClient() {
    return stateProtocol.clients[Math.floor(Math.random() * stateProtocol.clients.length)];
  }

  function resetGhostHoster() {
    if (stateProtocol.clients.length > 1) {
      let livePacman;
      Object.keys(stateProtocol.state.pacman).forEach((id) => {
        if (stateProtocol.state.pacman[id]['isLive']) {
          livePacman = id;
        }
      });

      if (livePacman) {
        ghostHoster = livePacman;
      } else {
        ghostHoster = '';
      }
    } else {
      ghostHoster = '';
    }
    dbProtocol.broadcast.ghostHoster(ghostHoster);
    console.log('change hoster', ghostHoster);
  }
};
