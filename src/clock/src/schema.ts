import { MuStruct } from 'muschema/struct';
import { MuUint32 } from 'muschema/uint32';
import { MuFloat64 } from 'muschema/float64';

export const MuPingResponseSchema = new MuStruct({
    clientClock: new MuFloat64(),
    serverClock: new MuFloat64(),
    skippedFrames: new MuUint32(),
});

export const MuClockProtocol = {
    client: {
        frameSkip: new MuUint32(),
        init: new MuStruct({
            tickRate: new MuFloat64(),
            serverClock: new MuFloat64(),
            skippedFrames: new MuUint32(),
        }),
        pong: MuPingResponseSchema,
    },
    server: {
        ping: new MuFloat64(),
    },
};
