import { MuServer } from 'mudb/server';
import { MuClockServer } from '../../server';
import { setInterval } from 'timers';

export = function (server:MuServer) {
  const clock = new MuClockServer({
    server,
    tick: (t) => {
      // console.log('tick:', t, ' ; ping:', clock.ping);
    },
    timeout: (sessionId) => {
      console.log('Timeout client:', sessionId);
    },
  });
  server.start();

  // randomly pause and resume server's clock
  const pause_resume_interval = setInterval(() => {
    if (clock.isTicking) {
      clock.pause();
    } else {
      clock.resume();
    }
    console.log('clock.isTicking', clock.isTicking);
  }, (Math.random() + 1 ) * 3000);
};
