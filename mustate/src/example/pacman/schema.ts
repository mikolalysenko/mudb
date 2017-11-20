import {
    MuStruct,
    MuDictionary,
    MuString,
    MuFloat64,
} from 'muschema';

export const PacmanSchema = new MuStruct({
    x: new MuFloat64(),
    y: new MuFloat64(),
    color: new MuString(),
});

export const GameSchema = {
    client: new MuString(),
    server: new MuString(),
};
