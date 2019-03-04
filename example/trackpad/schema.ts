import {
    MuStruct,
    MuDictionary,
    MuFloat64,
    MuUTF8,
} from 'mudb/schema';

export const PlayerSchema = new MuStruct({
    x: new MuFloat64(),
    y: new MuFloat64(),
    color: new MuUTF8('#fff'),
});

export const GameSchema = {
    client: PlayerSchema,
    server: new MuDictionary(PlayerSchema, Infinity),
};
