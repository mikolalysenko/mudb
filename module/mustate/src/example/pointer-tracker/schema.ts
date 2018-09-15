import {
    MuStruct,
    MuDictionary,
    MuFloat64,
    MuString,
} from 'muschema';

export const PlayerSchema = new MuStruct({
    x: new MuFloat64(),
    y: new MuFloat64(),
    color: new MuString('#fff'),
});

export const GameSchema = {
    client: PlayerSchema,
    server: new MuDictionary(PlayerSchema),
};
