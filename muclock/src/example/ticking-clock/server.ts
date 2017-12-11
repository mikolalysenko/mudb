import { MuServer } from 'mudb/server';
import { MuClockServer } from '../../server';
import { setInterval } from 'timers';

export = function (server:MuServer) {
  const clock = new MuClockServer({
    server,
    tick: (t) => {
    },
  });
  server.start();
};
