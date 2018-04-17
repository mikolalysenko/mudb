import {
    MuArray,
    MuInt8,
    MuInt32,
    MuString,
    MuFixedASCII,
} from 'muschema';

const IntegerSetSchema = new MuArray(new MuInt8());
const TotalSchema = new MuInt32();

const SecretSchema = new MuString();
const DigestSchema = new MuFixedASCII(128);

// always has two sides, client & server
export const RPCSchema = {
    client: {
        // `sum()` is implemented on client side of the protocol
        sum: {
            0: IntegerSetSchema,    // schema for argument of `sum()`
            1: TotalSchema,         // schema for return of `sum()`
        },
    },
    server: {
        // `hash()` is implemented on server side of the protocol
        hash: {
            0: SecretSchema,
            1: DigestSchema,
        },
    },
};
