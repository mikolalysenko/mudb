import test = require('tape');

import {
    MuArray,
    MuFloat64,
    MuString,
    MuUint32,
} from '../';

import {
    muType2TypedArray,
    muPrimitiveTypes,
} from '../constants';
import {
    muPrimitiveSchema,
    randomValueOf,
    testFactory,
    testPairFactory,
} from './_helper';

test('array - identity defaults to an empty array', (t) => {
    let arraySchema = new MuArray(new MuString());
    t.same(arraySchema.identity, []);

    const id = ['foo', 'bar'];
    arraySchema = new MuArray(new MuString(), id);
    t.equals(arraySchema.identity, id);

    t.end();
});

test('array - alloc() always returns an empty array', (t) => {
    let arraySchema = new MuArray(new MuFloat64());
    t.same(arraySchema.alloc(), []);

    arraySchema = new MuArray(
        new MuUint32(),
        [233, 666],
    );
    t.same(arraySchema.alloc(), []);

    t.end();
});

function nDArray (n, muType) {
    const length = Math.random() * 10 | 0;
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

function flatArrayOf (muType) {
    return nDArray(1, muType);
}

test('array - clone() can create copies of a flat array', (t) => {
    for (const muType of muPrimitiveTypes) {
        const valueSchema = muPrimitiveSchema(muType);
        const arraySchema = new MuArray(valueSchema);

        for (let i = 0; i < 200; ++i) {
            const arr = flatArrayOf(muType);
            const copy = arraySchema.clone(arr);

            t.notEquals(copy, arr);
            t.same(copy, arr);
        }
    }

    t.end();
});

test('array - clone() can create copies of a nested array', (t) => {
    for (const muType of muPrimitiveTypes) {
        const valueSchema = muPrimitiveSchema(muType);

        let arraySchema = new MuArray(
            new MuArray(valueSchema),
        );
        for (let i = 0; i < 100; ++i) {
            const array2D = nDArray(2, muType);
            const copy = arraySchema.clone(array2D);

            t.notEquals(copy, array2D);
            t.same(copy, array2D);
        }

        arraySchema = new MuArray(
            new MuArray(
                new MuArray(valueSchema),
            ),
        );
        for (let i = 0; i < 100; ++i) {
            const array3D = nDArray(3, muType);
            const copy = arraySchema.clone(array3D);

            t.notEquals(copy, array3D);
            t.same(copy, array3D);
        }

        arraySchema = new MuArray(
            new MuArray(
                new MuArray(
                    new MuArray(valueSchema),
                ),
            ),
        );
        for (let i = 0; i < 100; ++i) {
            const array4D = nDArray(4, muType);
            const copy = arraySchema.clone(array4D);

            t.notEquals(copy, array4D);
            t.same(copy, array4D);
        }
    }

    t.end();
});

test('array - calculating byte length', (t) => {
    const muType2BytesPerElement = {
        boolean: 1,
        float32: 4,
        float64: 8,
        int8: 1,
        int16: 2,
        int32: 4,
        uint8: 1,
        uint16: 2,
        uint32: 4,
    };

    for (const muType of muPrimitiveTypes) {
        const valueSchema = muPrimitiveSchema(muType);
        const arraySchema = new MuArray(valueSchema);

        const arr = flatArrayOf(muType);

        const LENGTH_BYTES = 4;

        const length = arr.length;
        const BITS_PER_BYTE = 8;
        const trackerBytes = Math.ceil(length / BITS_PER_BYTE);

        let elementBytes = length * muType2BytesPerElement[muType];

        if (muType === 'string') {
            const STR_LENGTH_BYTES = 4;
            const BYTES_PER_CHAR = 4;
            const sumStrsLength = arr.reduce(
                (acc, str) => acc + str.length,
                0,
            );
            elementBytes = length * STR_LENGTH_BYTES + sumStrsLength * BYTES_PER_CHAR;
        }

        t.equals(
            arraySchema.calcByteLength(arr),
            LENGTH_BYTES + trackerBytes + elementBytes,
        );
    }

    t.end();
});

test('array - applying patches to base array results in a copy of target array (flat)', (t) => {
    for (const muType of muPrimitiveTypes) {
        const valueSchema = muPrimitiveSchema(muType);
        const arraySchema = new MuArray(valueSchema);

        const doTest = testFactory(t, arraySchema);
        const arr = flatArrayOf(muType);
        doTest(arr, arr);

        const testPair = testPairFactory(t, arraySchema);
        for (let i = 0; i < 200; ++i) {
            testPair(
                flatArrayOf(muType),
                flatArrayOf(muType),
            );
        }
    }

    t.end();
});

test('array - applying patches to base array results in a copy of target array (nested)', (t) => {
    for (const muType of muPrimitiveTypes) {
        const valueSchema = muPrimitiveSchema(muType);

        let arraySchema = new MuArray(
            new MuArray(valueSchema),
        );

        let testPair = testPairFactory(t, arraySchema);
        for (let i = 0; i < 200; ++i) {
            testPair(
                nDArray(2, muType),
                nDArray(2, muType),
            );
        }

        arraySchema = new MuArray(
            new MuArray(
                new MuArray(valueSchema),
            ),
        );
        testPair = testPairFactory(t, arraySchema);
        for (let i = 0; i < 200; ++i) {
            testPair(
                nDArray(3, muType),
                nDArray(3, muType),
            );
        }

        arraySchema = new MuArray(
            new MuArray(
                new MuArray(
                    new MuArray(valueSchema),
                ),
            ),
        );
        testPair = testPairFactory(t, arraySchema);
        for (let i = 0; i < 200; ++i) {
            testPair(
                nDArray(4, muType),
                nDArray(4, muType),
            );
        }

        const doTest = testFactory(t, arraySchema);
        const arr = nDArray(4, muType);
        doTest(arr, arr);
    }

    t.end();
});
