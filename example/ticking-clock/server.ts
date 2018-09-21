import { MuServer } from 'mudb/server';
import { MuClockServer } from 'muclock/server';

export = function (server:MuServer) {
    const clock = new MuClockServer({
        server,
        tick: (t) => {
        },
    });
    server.start();
};
