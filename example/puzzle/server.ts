import { MuServer } from 'mudb/server';
import { MuReplicaServer } from 'mudb/replica/server';
import { PuzzleList } from './schema';

export = function (server:MuServer) {
    const replica = new MuReplicaServer({
        server: server,
        rda: PuzzleList,
        initialState:[
            {
                color: 'red',
                position: { x: 0, y: 0 },
                rotation: 0,
            },
            {
                color: 'green',
                position: { x: 100, y: 0 },
                rotation: 0,
            },
            {
                color: 'blue',
                position: { x: 0, y: 100 },
                rotation: 0,
            },
            {
                color: 'yellow',
                position: { x: 100, y: 100 },
                rotation: 0,
            },
        ],
    });
    replica.configure({
        connect:(sessionId) => {
            console.log(sessionId, ' connected');
        },
    });

    server.start();
};
