/*
import { MuServer } from 'mudb/server';
import { MuReplicaServer } from 'mudb/replica/server';
import { TodoListRDA } from './schema';

export = function (server:MuServer) {
    const replica = new MuReplicaServer({
        server,
        rda: TodoListRDA,
    });
    replica.configure({
        connect: (sessionId) => {
            console.log(`${sessionId} joined`);
        },
        disconnect: (sessionId) => {
            console.log(`${sessionId} left`);
        },
        change: (state) => {
            console.log(`state: ${state}`);
        },
    });
};
*/