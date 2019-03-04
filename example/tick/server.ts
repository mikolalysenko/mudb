import { MuServer } from 'mudb/server';
import { MuClockServer } from 'mudb/clock/server';

export = function (server:MuServer) {
    new MuClockServer({
        server,
        tickRate: 1000,
    });
    server.start();
};
