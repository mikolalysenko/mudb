import {
    MuStruct,
    MuInt8,
    MuString,
    MuArray,
    MuVoid,
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
