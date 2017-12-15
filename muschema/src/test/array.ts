import test = require('tape');

import {
    MuArray,
    MuBoolean,
    MuDictionary,
    MuFloat32,
    MuFloat64,
    MuInt8,
    MuInt16,
    MuInt32,
    MuString,
    MuStruct,
    MuUint8,
    MuUint16,
    MuUint32,
    MuVector,
} from '../';
import {
    MuReadStream,
    MuWriteStream,
} from 'mustreams';

import {
    randomValueOf,
    testPairFactory,
} from './_helper';
import { primitiveMuTypes, muType2ArrayType } from '../constants';

test('array - identity', (t) => {
    let arraySchema = new MuArray(new MuString());
    t.same(arraySchema.identity, []);

    const id = ['foo', 'bar'];
    arraySchema = new MuArray(new MuString(), id);
    t.equals(arraySchema.identity, id);

    t.end();
});

test('array - allocation', (t) => {
    let arraySchema = new MuArray(new MuFloat64());
    t.same(arraySchema.alloc(), []);

    arraySchema = new MuArray(
        new MuUint32(),
        [233, 666],
    );
    t.same(arraySchema.alloc(), []);

    t.end();
});

function randomArrayOfType (muType) {
    const length = Math.random() * 20 | 0;
    const result = new Array(length);
    for (let i = 0; i < length; ++i) {
        result[i] = randomValueOf(muType);
    }
    return result;
}

const muType2MuSchema = {
    // primitive
    'boolean': MuBoolean,
    'float32': MuFloat32,
    'float64': MuFloat64,
    'int8': MuInt8,
    'int16': MuInt16,
    'int32': MuInt32,
    'string': MuString,
    'uint8': MuUint8,
    'uint16': MuUint16,
    'uint32': MuUint32,

    // non-primitive
    'array': MuArray,
    'dictionary': MuDictionary,
    'struct': MuStruct,
    'vector': MuVector,
};

test('array - clone array of primitive', (t) => {
    for (const muType of primitiveMuTypes) {
        const valueSchema = new muType2MuSchema[muType]();
        const arraySchema = new MuArray(valueSchema);
        for (let i = 0; i < 100; ++i) {
            const arr = randomArrayOfType(muType);
            const copy = arraySchema.clone(arr);

            t.notEquals(copy, arr);
            t.same(copy, arr);
        }
    }

    t.end();
});

// create a n-dimensional array
function nDArray (n, muType) {
    const length = Math.random() * 5 | 0;
    const result = new Array(length);

    if (n <= 1) {
        for (let i = 0; i < length; ++i) {
            result[i] = randomValueOf(muType);
        }
        return result;
    }

    for (let i = 0; i < length; ++i) {
        result[i] = nDArray(n - 1, muType);
    }

    return result;
}

test('array - clone nested array', (t) => {
    for (const muType of primitiveMuTypes) {
        const valueSchema = new muType2MuSchema[muType]();
        const arraySchema = new MuArray(
            new MuArray(
                new MuArray(
                    new MuArray(valueSchema),
                ),
            ),
        );

        for (let j = 0; j < 20; ++j) {
            const array4D = nDArray(4, muType);
            const copy = arraySchema.clone(array4D);

            t.notEquals(copy, array4D);
            t.same(copy, array4D);
        }
    }

    t.end();
});

test('array - diff and patch array of primitive', (t) => {
    for (const muType of primitiveMuTypes) {
        const valueSchema = new muType2MuSchema[muType]();
        const arraySchema = new MuArray(valueSchema);

        const testPair = testPairFactory(t, arraySchema);

        for (let i = 0; i < 100; ++i) {
            testPair(randomArrayOfType(muType), randomArrayOfType(muType));
        }
    }

    t.end();
});

test('array - diff and patch nested array', (t) => {
    for (const muType of primitiveMuTypes) {
        const valueSchema = new muType2MuSchema[muType]();
        const arraySchema = new MuArray(
            new MuArray(valueSchema),
        );

        const testPair = testPairFactory(t, arraySchema);

        for (let i = 0; i < 200; ++i) {
            testPair(nDArray(2, muType), nDArray(2, muType));
        }
    }

    for (const muType of primitiveMuTypes) {
        const valueSchema = new muType2MuSchema[muType]();
        const arraySchema = new MuArray(
            new MuArray(
                new MuArray(valueSchema),
            ),
        );

        const testPair = testPairFactory(t, arraySchema);

        for (let i = 0; i < 100; ++i) {
            testPair(nDArray(3, muType), nDArray(3, muType));
        }
    }

    for (const muType of primitiveMuTypes) {
        const valueSchema = new muType2MuSchema[muType]();
        const arraySchema = new MuArray(
            new MuArray(
                new MuArray(
                    new MuArray(valueSchema),
                ),
            ),
        );

        const testPair = testPairFactory(t, arraySchema);

        for (let i = 0; i < 100; ++i) {
            testPair(nDArray(4, muType), nDArray(4, muType));
        }
    }

    t.end();
});
