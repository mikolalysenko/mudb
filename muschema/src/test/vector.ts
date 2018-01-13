import * as test from 'tape';

import {
    MuFloat64,
    MuUint8,
    MuVector,
} from '../';

import { muType2TypedArray } from '../constants';
import {
    muNumSchema,
    randomValueOf,
    testPatchingPairFactory,
} from './_helper';

test('vector - identity', (t) => {
    const vecSchema = new MuVector(new MuFloat64(5e-324), 3);
    t.same(vecSchema.identity, [5e-324, 5e-324, 5e-324]);

    t.end();
});

test('vector - alloc() when the pool is empty', (t) => {
    const vecSchema = new MuVector(new MuUint8(), 5);
    const uint8 = vecSchema.alloc();

    t.equals(uint8.constructor, Uint8Array);
    t.equals(uint8.length, 5);

    t.end();
});

function typedArrayOf (muType, length) {
    const result = new muType2TypedArray[muType](length);
    for (let i = 0; i < length; ++i) {
        result[i] = randomValueOf(muType);
    }
    return result;
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
        const valueSchema = muNumSchema(muType);
        const dimension = 100;
        const vecSchema = new MuVector(valueSchema, dimension);

        for (let i = 0; i < 200; ++i) {
            const vec = typedArrayOf(muType, dimension);
            const copy = vecSchema.clone(vec);

            t.notEquals(copy, vec);
            t.same(copy, vec);
        }
    }

    t.end();
});

test('vector - calcByteLength()', (t) => {
    for (const muType of muNumTypes) {
        const valueSchema = muNumSchema(muType);
        const dimension = 100;
        const vecSchema = new MuVector(valueSchema, dimension);

        const vec = typedArrayOf(muType, dimension);

        const dataBytes = dimension * vecSchema.identity.BYTES_PER_ELEMENT;
        const trackerBytes = Math.ceil(dataBytes / 8);

        t.equals(
            vecSchema.calcByteLength(vec),
            trackerBytes + dataBytes,
        );
    }

    t.end();
});

test('vector - diff() & patch()', (t) => {
    for (const muType of muNumTypes) {
        const valueSchema = muNumSchema(muType);
        const dimension = 100;
        const vecSchema = new MuVector(valueSchema, dimension);

        const testPatchingPair = testPatchingPairFactory(
            t,
            vecSchema,
            (vec) => new Uint8Array(vec.buffer),
        );

        for (let i = 0; i < 200; ++i) {
            testPatchingPair(
                typedArrayOf(muType, dimension),
                typedArrayOf(muType, dimension),
            );
        }
    }

    t.end();
});
