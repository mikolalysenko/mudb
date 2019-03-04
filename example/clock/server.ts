import { MuServer } from 'mudb/server';
import { MuClockServer } from 'mudb/clock/server';

export = function (server:MuServer) {
    const clock = new MuClockServer({
        server,
        tick: (t) => {
        },
    });
    server.start();
};
