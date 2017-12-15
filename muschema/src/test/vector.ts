import * as test from 'tape';

import {
    MuFloat32,
    MuFloat64,
    MuInt32,
    MuUint8,
    MuVector,
} from '../';
import { MuWriteStream, MuReadStream } from 'mustreams';

import { muType2ArrayType, primitiveMuTypes } from '../constants';
import {
    numSchema,
    randomValueOf,
    testPairFactory,
} from './_helper';

test('vector - identity', (t) => {
    const vecSchema = new MuVector(new MuFloat64(5e-324), 3);

    t.equals(vecSchema.identity.constructor, Float64Array);
    t.equals(vecSchema.identity.length, 3);
    t.equals(vecSchema.identity[0], 5e-324);

    t.end();
});

test('vector - alloc()', (t) => {
    const vecSchema = new MuVector(new MuUint8(), 5);
    const uint8 = vecSchema.alloc();

    t.equals(uint8.constructor, Uint8Array);
    t.equals(uint8.length, 5);

    t.end();
});

function randomTypedArray (muType, length) {
    const arr = new Array(length);
    for (let i = 0; i < length; ++i) {
        arr[i] = randomValueOf(muType);
    }
    return new muType2ArrayType[muType](arr);
}

const muNumTypes = [
    'float32',
    'float64',
    'int8',
    'int16',
    'int32',
    'uint8',
    'uint16',
    'uint32',
];

test('vector - clone()', (t) => {
    for (const muType of muNumTypes) {
        const valueSchema = numSchema(muType);
        const dimension = 20;
        const vecSchema = new MuVector(valueSchema, dimension);

        for (let i = 0; i < 100; ++i) {
            const vec = randomTypedArray(muType, dimension);
            const copy = vecSchema.clone(vec);

            t.notEquals(copy, vec);
            t.same(copy, vec);
        }
    }

    t.end();
});

test('vector - diffing & patching', (t) => {
    for (const muType of muNumTypes) {
        const valueSchema = numSchema(muType);
        const dimension = 20;
        const vecSchema = new MuVector(valueSchema, dimension);

        const testPair = testPairFactory(
            t,
            vecSchema,
            (vec) => new Uint8Array(vec.buffer),
        );

        for (let i = 0; i < 100; ++i) {
            testPair(
                randomTypedArray(muType, dimension),
                randomTypedArray(muType, dimension),
            );
        }
    }

    t.end();
});
