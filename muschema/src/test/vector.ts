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
    testPairFactory,
} from './_helper';

test('vector - identity', (t) => {
    const vecSchema = new MuVector(new MuFloat64(5e-324), 3);

    t.equals(vecSchema.identity.constructor, Float64Array);
    t.equals(vecSchema.identity.length, 3);
    t.equals(vecSchema.identity[0], 5e-324);

    t.end();
});

test('vector - allocation when the pool is empty', (t) => {
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

test('vector - cloning', (t) => {
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

test('vector - diffing & patching', (t) => {
    for (const muType of muNumTypes) {
        const valueSchema = muNumSchema(muType);
        const dimension = 100;
        const vecSchema = new MuVector(valueSchema, dimension);

        const testPair = testPairFactory(
            t,
            vecSchema,
            (vec) => new Uint8Array(vec.buffer),
        );

        for (let i = 0; i < 200; ++i) {
            testPair(
                typedArrayOf(muType, dimension),
                typedArrayOf(muType, dimension),
            );
        }
    }

    t.end();
});
