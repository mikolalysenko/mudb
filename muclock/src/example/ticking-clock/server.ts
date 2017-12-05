import { MuServer } from 'mudb/server';
import { MuClockServer } from '../../server';
import { setInterval } from 'timers';

export = function (server:MuServer) {
  const clock = new MuClockServer({
    server,
    tick: (t) => {
      console.log('tick:', t, ' ; ping:', clock.ping);
    },
  });
  server.start();

  const pause_resume_interval = setInterval(() => {
    console.log('clock.isTicking', clock.isTicking());
    if (clock.isTicking()) {
      clock.pause();
    } else {
      clock.resume();
    }
  }, 1000);
};
