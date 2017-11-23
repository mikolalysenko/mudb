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
    state: (client, {pacman, ghostHoster, ghosts}) => {
      protocol.state.pacman[client.sessionId] = pacman;
      if (pacman.isLive) {
        protocol.state.ghostHoster = client.sessionId;
        protocol.state.ghosts = ghosts;
      } else {
        protocol.state.ghostHoster = '';
      }
      protocol.commit();
    },
    connect: (client) => {},
    disconnect: (client) => {
      if (protocol.state.pacman[client.sessionId]) {
        protocol.state.pacman[client.sessionId]['isLive'] = false;
        protocol.state.ghostHoster = '';
        protocol.commit();
        delete protocol.state.pacman[client.sessionId];
      }
    },
  });
  server.start();
};
