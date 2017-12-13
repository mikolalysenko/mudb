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
    MuVoid,
} from '../';
import { MuWriteStream, MuReadStream } from 'mustreams';

import {
    randomShortStr,
    randomStr,
    randomValueOf,
    testPairFactory,
} from './_helper';
import {
    primitiveMuTypes,
} from '../constants';

test('dictionary - identity', (t) => {
    const dictA = new MuDictionary(new MuVoid());

    t.same(dictA.identity, {});

    const confession = {
        married: true,
        hadAffairs: true,
        havingAnAffair: true,
    };
    const dictB = new MuDictionary(new MuBoolean(), confession);

    t.equals(dictB.identity, confession);

    t.end();
});

test('dictionary - muData', (t) => {
    const dict = new MuDictionary(new MuUint8());
    t.equals(dict.muData.muType, 'uint8');

    t.end();
});

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

function randomDict (depth, muType, randomStrFn) {
    const result = {};
    const numProps = Math.random() * 10 | 0;

    if (depth <= 1) {
        for (let i = 0; i < numProps; ++i) {
            result[randomStrFn()] = randomValueOf(muType);
        }
        return result;
    }

    for (let i = 0; i < numProps; ++i) {
        result[randomStrFn()] = randomDict(depth - 1, muType, randomStrFn);
    }

    return result;
}

test('dictionary - clone flat dictionary', (t) => {
    for (const muType of primitiveMuTypes) {
        const valueSchema = new muType2MuSchema[muType]();
        const dictSchema = new MuDictionary(valueSchema);

        for (let i = 0; i < 100; ++i) {
            const dict = randomDict(1, muType, randomStr);
            const copy = dictSchema.clone(dict);

            t.notEquals(copy, dict);
            t.same(copy, dict);
        }
    }

    t.end();
});

test('dictionary - clone nested dictionary', (t) => {
    for (const muType of primitiveMuTypes) {
        const valueSchema = new muType2MuSchema[muType]();
        const dictSchema = new MuDictionary(
            new MuDictionary(valueSchema),
        );

        for (let i = 0; i < 20; ++i) {
            const dict = randomDict(2, muType, randomStr);
            const copy = dictSchema.clone(dict);

            t.notEquals(copy, dict);
            t.same(copy, dict);
        }
    }

    for (const muType of primitiveMuTypes) {
        const valueSchema = new muType2MuSchema[muType]();
        const dictSchema = new MuDictionary(
            new MuDictionary(
                new MuDictionary(valueSchema),
            ),
        );

        for (let i = 0; i < 20; ++i) {
            const dict = randomDict(3, muType, randomStr);
            const copy = dictSchema.clone(dict);

            t.notEquals(copy, dict);
            t.same(copy, dict);
        }
    }

    t.end();
});

test('dictionary - diff and patch flat dictionary', (t) => {
    for (const muType of primitiveMuTypes) {
        const valueSchema = new muType2MuSchema[muType]();
        const dictSchema = new MuDictionary(valueSchema);

        const testPair = testPairFactory(t, dictSchema);
        for (let i = 0; i < 100; ++i) {
            // increase the chance of creating objects with properties of the same name
            testPair(randomDict(1, muType, randomShortStr), randomDict(1, muType, randomShortStr));
        }
    }

    for (const muType of primitiveMuTypes) {
        const valueSchema = new muType2MuSchema[muType]();
        const dictSchema = new MuDictionary(valueSchema);

        const testPair = testPairFactory(t, dictSchema);
        for (let i = 0; i < 100; ++i) {
            testPair(randomDict(1, muType, randomStr), randomDict(1, muType, randomStr));
        }
    }

    t.end();
});

test('dictionary - diff and patch nested dictionary', (t) => {
    for (const muType of primitiveMuTypes) {
        const valueSchema = new muType2MuSchema[muType]();
        const dictSchema = new MuDictionary(
            new MuDictionary(valueSchema),
        );

        const testPair = testPairFactory(t, dictSchema);
        for (let i = 0; i < 20; ++i) {
            testPair(randomDict(2, muType, randomShortStr), randomDict(2, muType, randomShortStr));
        }
    }

    for (const muType of primitiveMuTypes) {
        const valueSchema = new muType2MuSchema[muType]();
        const dictSchema = new MuDictionary(
            new MuDictionary(
                new MuDictionary(valueSchema),
            ),
        );

        const testPair = testPairFactory(t, dictSchema);
        for (let i = 0; i < 20; ++i) {
            testPair(randomDict(3, muType, randomShortStr), randomDict(3, muType, randomShortStr));
        }
    }

    for (const muType of primitiveMuTypes) {
        const valueSchema = new muType2MuSchema[muType]();
        const dictSchema = new MuDictionary(
            new MuDictionary(
                new MuDictionary(
                    new MuDictionary(valueSchema),
                ),
            ),
        );

        const testPair = testPairFactory(t, dictSchema);
        for (let i = 0; i < 20; ++i) {
            testPair(randomDict(4, muType, randomShortStr), randomDict(4, muType, randomShortStr));
        }
    }

    t.end();
});
