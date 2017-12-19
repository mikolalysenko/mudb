import test = require('tape');

import {
    MuBoolean,
    MuDictionary,
    MuVoid,
} from '../';

import { muPrimitiveTypes } from '../constants';
import {
    muPrimitiveSchema,
    randomShortStr,
    randomStr,
    randomValueOf,
    testPatchingFactory,
    testPatchingPairFactory,
} from './_helper';

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

function dictOfDepth (depth, muType, genStr=randomShortStr) {
    const result = {};
    const numProps = Math.random() * 5 | 0;

    if (depth <= 1) {
        for (let i = 0; i < numProps; ++i) {
            result[genStr()] = randomValueOf(muType);
        }
        return result;
    }

    for (let i = 0; i < numProps; ++i) {
        result[genStr()] = dictOfDepth(depth - 1, muType, genStr);
    }
    return result;
}

function flatDictOf (muType, genStrFn=randomStr) {
    return dictOfDepth(1, muType, genStrFn);
}

test('dictionary (flat) - clone()', (t) => {
    for (const muType of muPrimitiveTypes) {
        const valueSchema = muPrimitiveSchema(muType);
        const dictSchema = new MuDictionary(valueSchema);

        for (let i = 0; i < 200; ++i) {
            const dict = flatDictOf(muType);
            const copy = dictSchema.clone(dict);

            t.notEquals(copy, dict);
            t.same(copy, dict);
        }
    }

    t.end();
});

test('dictionary (nested) - clone()', (t) => {
    for (const muType of muPrimitiveTypes) {
        const valueSchema = muPrimitiveSchema(muType);

        let dictSchema = new MuDictionary(
            new MuDictionary(valueSchema),
        );
        for (let i = 0; i < 100; ++i) {
            const dict = dictOfDepth(2, muType, randomStr);
            const copy = dictSchema.clone(dict);

            t.notEquals(copy, dict);
            t.same(copy, dict);
        }

        dictSchema = new MuDictionary(
            new MuDictionary(
                new MuDictionary(valueSchema),
            ),
        );
        for (let i = 0; i < 100; ++i) {
            const dict = dictOfDepth(3, muType, randomStr);
            const copy = dictSchema.clone(dict);

            t.notEquals(copy, dict);
            t.same(copy, dict);
        }
    }

    t.end();
});

test('dictionary - calcByteLength()', (t) => {
    function sumStrsLength (strs:string[]) {
        return strs.reduce(
            (acc, str) => acc + str.length,
            0,
        );
    }

    function calcStrsByteLength (strs:string[]) {
        let result = 0;

        const STR_LENGTH_BYTES = 4;
        const BYTES_PER_CHAR = 4;

        result += strs.length * STR_LENGTH_BYTES;
        result += sumStrsLength(strs) * BYTES_PER_CHAR;

        return result;
    }

    const muType2numBytes = {
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
        const dictSchema = new MuDictionary(valueSchema);

        const dict = flatDictOf(muType, randomShortStr);

        const COUNTER_BYTES = 8;

        const props = Object.keys(dict);
        const propsByteLength = calcStrsByteLength(props);
        const numProps = props.length;

        let valuesByteLength = numProps * muType2numBytes[muType];

        if (muType === 'string') {
            const values = props.map((k) => dict[k]);
            valuesByteLength = calcStrsByteLength(values);
        }

        t.equals(dictSchema.calcByteLength(dict), COUNTER_BYTES + propsByteLength + valuesByteLength);
    }

    t.end();
});

test('dictionary (flat) - diff() & patch()', (t) => {
    for (const muType of muPrimitiveTypes) {
        const valueSchema = muPrimitiveSchema(muType);
        const dictSchema = new MuDictionary(valueSchema);

        const testPatchingPair = testPatchingPairFactory(t, dictSchema);

        for (let i = 0; i < 200; ++i) {
            testPatchingPair(
                flatDictOf(muType, randomStr),
                flatDictOf(muType, randomStr),
            );
        }

        for (let i = 0; i < 200; ++i) {
            // increase the chance of getting properties with the same name
            testPatchingPair(
                flatDictOf(muType, randomShortStr),
                flatDictOf(muType, randomShortStr),
            );
        }

        const testPatching = testPatchingFactory(t, dictSchema);
        const dict = flatDictOf(muType);
        testPatching(dict, dict);
    }

    t.end();
});

test('dictionary (nested) - diff() & patch()', (t) => {
    for (const muType of muPrimitiveTypes) {
        const valueSchema = muPrimitiveSchema(muType);

        let dictSchema = new MuDictionary(
            new MuDictionary(valueSchema),
        );
        let testPatchingPair = testPatchingPairFactory(t, dictSchema);
        for (let i = 0; i < 200; ++i) {
            testPatchingPair(
                dictOfDepth(2, muType),
                dictOfDepth(2, muType),
            );
        }

        dictSchema = new MuDictionary(
            new MuDictionary(
                new MuDictionary(valueSchema),
            ),
        );
        testPatchingPair = testPatchingPairFactory(t, dictSchema);
        for (let i = 0; i < 200; ++i) {
            testPatchingPair(
                dictOfDepth(3, muType),
                dictOfDepth(3, muType),
            );
        }

        dictSchema = new MuDictionary(
            new MuDictionary(
                new MuDictionary(
                    new MuDictionary(valueSchema),
                ),
            ),
        );
        testPatchingPair = testPatchingPairFactory(t, dictSchema);
        for (let i = 0; i < 200; ++i) {
            testPatchingPair(
                dictOfDepth(4, muType),
                dictOfDepth(4, muType),
            );
        }

        const testPatching = testPatchingFactory(t, dictSchema);
        const dict = dictOfDepth(4, muType);
        testPatching(dict, dict);
    }

    t.end();
});
