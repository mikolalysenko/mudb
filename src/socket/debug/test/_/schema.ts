import { MuUint32 } from '../../../../schema';

export const protocolSchema = {
    client: {
        pong: new MuUint32(),
    },
    server: {
        ping: new MuUint32(),
    },
};
