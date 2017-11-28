import {
    MuInt8,
    MuString,
    MuArray,
    MuDictionary,
} from 'muschema';

export const RPCSchema = {
    client: {
        combine: {
            0: new MuArray(new MuInt8()), //arg
            1: new MuInt8(), //response
        },
    },
    server: {
        combine: {
            0: new MuArray(new MuInt8()), //arg
            1: new MuInt8(), //response
        },
    },
};
