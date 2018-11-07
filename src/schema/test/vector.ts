import test = require('tape');

import {
    MuFloat32,
    MuFloat64,
    MuUint8,
    MuVector,
} from '../';
import { MuWriteStream, MuReadStream } from '../../stream';
import { muType2TypedArray } from '../constants';
import {
    muNumberSchema,
    randomValue,
    testPatchingPairFactory,
} from './helper';

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

function randomTypedArray (muType, length) {
    const result = new muType2TypedArray[muType](length);
    for (let i = 0; i < length; ++i) {
        result[i] = randomValue(muType);
    }
    return result;
}

const muNumberTypes = [
    'float32',
    'float64',
    'int8',
    'int16',
    'int32',
    'uint8',
    'uint16',
    'uint32',
];

test('vector - equal()', (t) => {
    const valueSchema = muNumberSchema('uint8');
    const vectorSchema = new MuVector(valueSchema, 1);

    const a = new Uint8Array([0]);
    const b = new Uint8Array([0]);
    t.ok(vectorSchema.equal(a, b));

    b[0] = 1;
    t.notOk(vectorSchema.equal(a, b));

    const c = new Uint8Array([0, 0]);
    t.notOk(vectorSchema.equal(a, c));

    const d = new Int8Array([0]);
    t.notOk(vectorSchema.equal(a, d));

    const f = new Int8Array([0]);
    t.notOk(vectorSchema.equal(d, f));

    t.end();
});

test('vector - clone()', (t) => {
    for (const muType of muNumberTypes) {
        const valueSchema = muNumberSchema(muType);
        const dimension = 100;
        const vecSchema = new MuVector(valueSchema, dimension);

        for (let i = 0; i < 200; ++i) {
            const vec = randomTypedArray(muType, dimension);
            const copy = vecSchema.clone(vec);

            t.notEquals(copy, vec);
            t.same(copy, vec);
        }
    }

    t.end();
});

test('vector - diff() & patch()', (t) => {
    for (const muType of muNumberTypes) {
        const valueSchema = muNumberSchema(muType);
        const dimension = 5;
        const vecSchema = new MuVector(valueSchema, dimension);

        const testPatchingPair = testPatchingPairFactory(
            t,
            vecSchema);

        for (let i = 0; i < 200; ++i) {
            testPatchingPair(
                randomTypedArray(muType, dimension),
                randomTypedArray(muType, dimension),
            );
        }
    }

    t.end();
});

test('random test', (t) => {
    const testSchema = new MuVector(new MuFloat32(0.5), 3);
    type vectorT = typeof testSchema['identity'];

    function randomVector () {
        const result = testSchema.alloc();
        result[0] = ((Math.random() * 4) / 2) - 1;
        result[1] = ((Math.random() * 4) / 2) - 1;
        result[2] = ((Math.random() * 4) / 2) - 1;
        return result;
    }

    function calcDiff (a:vectorT, b:vectorT) : MuReadStream {
        const x = new MuWriteStream(1);
        testSchema.diff(a, b, x);
        return new MuReadStream(x.bytes());
    }

    function testPair (a:vectorT, b:vectorT) {
        const x = calcDiff(a, b);
        if (x.length === 0) {
            t.same(a, b, 'vectors are equal');
        } else {
            const c = testSchema.patch(a, x);
            t.same(b, c, 'patch ok');
            t.equals(x.length, x.offset, 'offset ok');
        }
    }

    for (let i = 0; i < 100; ++i) {
        const as = randomVector();
        const bs = randomVector();
        testPair(as, bs);
        testPair(bs, as);
        testPair(testSchema.identity, as);
        testPair(testSchema.identity, bs);
    }

    t.end();
});
