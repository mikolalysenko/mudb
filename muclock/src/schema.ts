import { MuBoolean } from 'muschema/boolean';
import { MuStruct } from 'muschema/struct';
import { MuUint32 } from 'muschema/uint32';
import { MuVoid } from 'muschema/void';
import { MuFloat64 } from 'muschema/float64';

export const MuClockProtocol = {
    client: {
        init: new MuStruct({
            tickRate: new MuUint32(),
            serverClock: new MuFloat64(),
        }),
        ping: new MuUint32(),
        pong: new MuFloat64(),
    },
    server: {
        ping: new MuVoid(),
        pong: new MuUint32(),
    },
};
