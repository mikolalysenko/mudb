import { GameSchema } from './schema';
import { MuServer } from 'mudb/server';
import {  MuServerState } from '../../server';

export = function(server:MuServer) {
  const protocol = new MuServerState({
    schema: GameSchema,
    server,
    windowSize: 0,
  });

  protocol.configure({
    state: (client, {pacman, isGhostHoster, ghosts}) => {
      protocol.state.pacman[client.sessionId] = pacman;

      if (isGhostHoster || protocol.state.ghostHoster === client.sessionId) {
        protocol.state.ghostHoster = client.sessionId;
        console.log(protocol.state.ghostHoster);
        if (pacman.isLive) {
          protocol.state.ghosts = ghosts;
        } else {
          resetGhostHoster();
        }
      }
      protocol.commit();
    },
    connect: (client) => {},
    disconnect: (client) => {
      if (protocol.state.pacman[client.sessionId]) {
        protocol.state.pacman[client.sessionId]['isLive'] = false;
        if (protocol.state.ghostHoster === client.sessionId) {
          resetGhostHoster();
        }
        protocol.commit();
        delete protocol.state.pacman[client.sessionId];
      }
    },
  });
  server.start();

  function getRandomClient() {
    return protocol.clients[Math.floor(Math.random() * protocol.clients.length)];
  }

  function resetGhostHoster() {
    if (protocol.clients.length > 1) {
      let randomClient = getRandomClient();
      while (randomClient.sessionId === protocol.state.ghostHoster) {
        randomClient = getRandomClient();
      }
      protocol.state.ghostHoster = randomClient.sessionId;
    } else {
      protocol.state.ghostHoster = '';
    }
    console.log('change hoster', protocol.state.ghostHoster);
  }
};
