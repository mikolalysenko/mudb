import { MuClient } from 'mudb/client';
import { MuReplicaClient } from 'mudb/replica/client';
import { Puzzle } from './schema';

export = function (client:MuClient) {
    const replica = new MuReplicaClient({
        client,
        rda: Puzzle,
    });

    replica.configure({
        change: (state) => {
            // render state using react/whatever
        },
    });

    replica.undo();
    replica.redo();
};