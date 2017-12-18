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
    testPairFactory,
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

test('dictionary - clone flat dictionary', (t) => {
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

test('dictionary - clone nested dictionary', (t) => {
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

test('dictionary - diff and patch flat dictionary', (t) => {
    for (const muType of muPrimitiveTypes) {
        const valueSchema = muPrimitiveSchema(muType);
        const dictSchema = new MuDictionary(valueSchema);

        const testPair = testPairFactory(t, dictSchema);

        for (let i = 0; i < 200; ++i) {
            testPair(
                flatDictOf(muType, randomStr),
                flatDictOf(muType, randomStr),
            );
        }

        for (let i = 0; i < 200; ++i) {
            // increase the chance of getting properties with the same name
            testPair(
                flatDictOf(muType, randomShortStr),
                flatDictOf(muType, randomShortStr),
            );
        }
    }

    t.end();
});

test('dictionary - diff and patch nested dictionary', (t) => {
    for (const muType of muPrimitiveTypes) {
        const valueSchema = muPrimitiveSchema(muType);

        let dictSchema = new MuDictionary(
            new MuDictionary(valueSchema),
        );
        let testPair = testPairFactory(t, dictSchema);
        for (let i = 0; i < 200; ++i) {
            testPair(
                dictOfDepth(2, muType),
                dictOfDepth(2, muType),
            );
        }

        dictSchema = new MuDictionary(
            new MuDictionary(
                new MuDictionary(valueSchema),
            ),
        );
        testPair = testPairFactory(t, dictSchema);
        for (let i = 0; i < 200; ++i) {
            testPair(
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
        testPair = testPairFactory(t, dictSchema);
        for (let i = 0; i < 200; ++i) {
            testPair(
                dictOfDepth(4, muType),
                dictOfDepth(4, muType),
            );
        }
    }

    t.end();
});
