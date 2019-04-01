import {
    MuStruct,
    MuFloat64,
    MuASCII,
    MuDictionary,
} from 'mudb/schema';

export const PlayerSchema = new MuStruct({
    x: new MuFloat64(),
    y: new MuFloat64(),
    color: new MuASCII('#fff'),
});

export const PlayerSetSchema = new MuDictionary(PlayerSchema, Infinity);

export const ControllerSchema = {
    client: {},
    server: {
        move: new MuStruct({
            x: new MuFloat64(),
            y: new MuFloat64(),
        }),
    },
};
