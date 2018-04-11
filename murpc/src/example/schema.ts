import {
    MuArray,
    MuInt8,
    MuInt32,
    MuString,
    MuFixedASCII,
} from 'muschema';

const IntegerSetSchema = new MuArray(new MuInt8());
const TotalSchema = new MuInt32();

const secretSchema = new MuString();
const digestSchema = new MuFixedASCII(128);

// always has two sides, client & server
export const RPCSchema = {
    client: {
        sum: {
            0: IntegerSetSchema,    // schema for argument of `sum()`
            1: TotalSchema,         // schema for return of `sum()`
        },
    },
    server: {
        hash: {
            0: secretSchema,
            1: digestSchema,
        },
    },
};
