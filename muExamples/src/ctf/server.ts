import { StateSchema, MsgSchema } from './schema';
import { MuServer } from 'mudb/server';
import { MuServerState } from 'mustate/server';

export = function(server:MuServer) {
    const stateProtocol = new MuServerState({
        schema: StateSchema,
        server,
        windowSize: 0,
    });

    const msgProtocol = server.protocol(MsgSchema);

    stateProtocol.configure({
        state: (client, {}) => {

        },
        connect: (client) => {

        },
        disconnect: (client) => {

        },
    });

    msgProtocol.configure({
        message: {

        },
    });

    server.start();
};
