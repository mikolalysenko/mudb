import {
    MuArray,
    MuInt8,
    MuInt32,
    MuString,
    MuFixedASCII,
} from 'muschema';
import { MuRPC } from '../rpc';

const IntegerSetSchema = new MuArray(new MuInt8());
const TotalSchema = new MuInt32();

const SecretSchema = new MuString();
const DigestSchema = new MuFixedASCII(128);

// always has two sides, client & server
export const RPCSchema = {
    client: {
        // `sum()` is implemented on client side of the protocol

        // IntegerSetSchema is schema of the argument of `sum()`
        // so the argument must be an array of int8
        // TotalSchema is schema of the return of `sum()`
        // so the return must be an int32
        sum: MuRPC(IntegerSetSchema, TotalSchema),
    },
    server: {
        // `hash()` is implemented on server side of the protocol

        // first argument is schema of the argument of `hash()`
        // so the argument must be a string
        // second argument is schema of the return of `hash()`
        // so the return must be a 128-character ASCII string
        hash: MuRPC(SecretSchema, DigestSchema),
    },
};
