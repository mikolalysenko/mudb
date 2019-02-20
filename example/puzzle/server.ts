import { MuServer } from 'mudb/server';
import { MuReplicaServer } from 'mudb/replica/server';
import { Puzzle } from './schema';

export = function (server:MuServer) {
    const replica = new MuReplicaServer({
        server: server,
        rda: Puzzle,
        initialState:{
            'red':{
                color: 'red',
                position: { x: 0, y: 0 },
                rotation: 0,
            },
            'green':{
                color: 'green',
                position: { x: 100, y: 0 },
                rotation: 0,
            },
            'blue':{
                color: 'blue',
                position: { x: 0, y: 100 },
                rotation: 0,
            },
            'yellow':{
                color: 'yellow',
                position: { x: 100, y: 100 },
                rotation: 0,
            },
        },
    });
    replica.configure({ });
};