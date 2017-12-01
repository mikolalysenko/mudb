import { MuServer } from 'mudb/server';
import { MuClockServer } from '../../server';

export = function (server:MuServer) {
  const clock = new MuClockServer({
    server,
    tick: (t) => {
      console.log('tick:', t, ' ; ping:', clock.ping);
    },
  });
  server.start();
};
