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

import { randomValue } from './_helper';
import { primitiveMuTypes } from '../constants';

test('array - identity', (t) => {
    let arraySchema = new MuArray(new MuString());
    t.same(arraySchema.identity, []);

    arraySchema = new MuArray(
        new MuString(),
        ['foo', 'bar'],
    );
    t.same(arraySchema.identity, ['foo', 'bar']);

    t.end();
});

test('array - allocation', (t) => {
    let arraySchema = new MuArray(new MuFloat64());
    t.same(arraySchema.alloc(), []);

    arraySchema = new MuArray(
        new MuUint32(),
        [233, 666],
    );
    t.same(arraySchema.alloc(), [233, 666]);

    t.end();
});

function randomArrayOfType (muType) {
    const length = Math.random() * 20 | 0;
    const result = new Array(length);
    for (let i = 0; i < length; ++i) {
        result[i] = randomValue(muType);
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
            const array4D = (function nDArray (dimension:number) {
                const length = Math.random() * 20 | 0;
                const result = new Array(length);

                if (dimension <= 1) {
                    for (let i = 0; i < length; ++i) {
                        result[i] = randomValue(muType);
                    }
                    return result;
                }

                for (let i = 0; i < length; ++i) {
                    result[i] = nDArray(dimension - 1);
                }

                return result;
            })(4);
            const copy = arraySchema.clone(array4D);

            t.notEquals(copy, array4D);
            t.same(copy, array4D);
        }
    }

    t.end();
});

test('array - diffing & patching', (t) => {
    for (const muType of primitiveMuTypes) {
        const valueSchema = new muType2MuSchema[muType]();
        const arraySchema = new MuArray(valueSchema);

        const patch = (arrayA, arrayB) => {
            const ws = new MuWriteStream(2);
            arraySchema.diffBinary(arrayA, arrayB, ws);
            const rs = new MuReadStream(ws);
            return arraySchema.patchBinary(arrayA, rs);
        };

        const testPair = (a, b) => {
            t.same(patch(a, b), b);
            t.same(patch(b, a), a);
        };

        for (let i = 0; i < 100; ++i) {
            testPair(randomArrayOfType(muType), randomArrayOfType(muType));
        }
    }

    t.end();
});
