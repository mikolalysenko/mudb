import {
    MuStruct,
    MuDictionary,
    MuString,
    MuFloat64,
    MuBoolean,
} from 'muschema';

export const PacmanSchema = new MuStruct({
    x: new MuFloat64(),
    y: new MuFloat64(),
    color: new MuString(),
    dir: new MuFloat64(),
    mouthOpen: new MuBoolean(),
    isLive: new MuBoolean(),
});

export const GhostSchema = new MuStruct({
    x: new MuFloat64(),
    y: new MuFloat64(),
    color: new MuString(),
    dir: new MuFloat64(),
    isWeak: new MuBoolean(),
    isBlinking: new MuBoolean(),
    isDead: new MuBoolean(),
});

export const GameSchema = {
    client: PacmanSchema,
    server: new MuDictionary(PacmanSchema),
};
