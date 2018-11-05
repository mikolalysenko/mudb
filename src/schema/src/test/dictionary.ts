import test = require('tape');
import equal = require('fast-deep-equal');

import {
    MuBoolean,
    MuDictionary,
    MuVoid,
} from '../';

import { muPrimitiveTypes } from '../constants';
import {
    muPrimitiveSchema,
    randomShortStr,
    randomString,
    randomValue,
    testPatchingFactory,
    testPatchingPairFactory,
} from './helper';

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

function randomDictionary (depth, muType, genKey, numProps_?:number) {
    const result = {};
    const numProps = numProps_ || Math.random() * 5 | 0;

    if (depth <= 1) {
        for (let i = 0; i < numProps; ++i) {
            result[genKey()] = randomValue(muType);
        }
        return result;
    }

    for (let i = 0; i < numProps; ++i) {
        result[genKey()] = randomDictionary(depth - 1, muType, genKey, numProps_);
    }

    return result;
}

function genDictionary (depth, muType, numProps=5) {
    const result = {};
    let charCode = 97;

    if (depth === 1) {
        for (let i = 0; i < numProps; ++i) {
            result[String.fromCharCode(charCode++)] = randomValue(muType);
        }
        return result;
    }

    for (let i = 0; i < numProps; ++i) {
        result[String.fromCharCode(charCode++)] = genDictionary(depth - 1, muType, numProps);
    }

    return result;
}

test('dictionary - equal()', (t) => {
    for (const muType of muPrimitiveTypes) {
        const valueSchema = muPrimitiveSchema(muType);
        if (valueSchema) {
            const dictionarySchema = new MuDictionary(valueSchema);

            t.ok(dictionarySchema.equal({}, {}));

            const dictionary = randomDictionary(1, valueSchema, randomString);
            t.ok(dictionarySchema.equal(dictionarySchema.clone(dictionary), dictionary));

            let a = genDictionary(1, muType);
            let b = genDictionary(1, muType);
            t.equal(dictionarySchema.equal(a, b), equal(a, b));

            a = randomDictionary(1, muType, randomString, 5);
            b = randomDictionary(1, muType, randomString, 5);
            t.equal(dictionarySchema.equal(a, b), equal(a, b));

            for (let i = 0; i < 10; ++i) {
                a = randomDictionary(1, muType, randomString);
                b = randomDictionary(1, muType, randomString);
                t.equal(dictionarySchema.equal(a, b), equal(a, b));
            }
        }
    }

    for (const muType of muPrimitiveTypes) {
        const valueSchema = muPrimitiveSchema(muType);
        if (valueSchema) {
            const dictionarySchema = new MuDictionary(
                new MuDictionary(valueSchema),
            );

            t.ok(dictionarySchema.equal({}, {}));

            const dictionary = randomDictionary(2, valueSchema, randomString);
            t.ok(dictionarySchema.equal(dictionarySchema.clone(dictionary), dictionary));

            let a = genDictionary(2, muType);
            let b = genDictionary(2, muType);
            t.equal(dictionarySchema.equal(a, b), equal(a, b));

            a = randomDictionary(2, muType, randomString, 5);
            b = randomDictionary(2, muType, randomString, 5);
            t.equal(dictionarySchema.equal(a, b), equal(a, b));

            for (let i = 0; i < 10; ++i) {
                a = randomDictionary(2, muType, randomString);
                b = randomDictionary(2, muType, randomString);
                t.equal(dictionarySchema.equal(a, b), equal(a, b));
            }
        }
    }

    for (const muType of muPrimitiveTypes) {
        const valueSchema = muPrimitiveSchema(muType);
        if (valueSchema) {
            const dictionarySchema = new MuDictionary(
                new MuDictionary(valueSchema),
            );

            t.ok(dictionarySchema.equal({}, {}));

            const dictionary = randomDictionary(3, valueSchema, randomString);
            t.ok(dictionarySchema.equal(dictionarySchema.clone(dictionary), dictionary));

            let a = genDictionary(3, muType);
            let b = genDictionary(3, muType);
            t.equal(dictionarySchema.equal(a, b), equal(a, b));

            a = randomDictionary(3, muType, randomString, 5);
            b = randomDictionary(3, muType, randomString, 5);
            t.equal(dictionarySchema.equal(a, b), equal(a, b));

            for (let i = 0; i < 10; ++i) {
                a = randomDictionary(3, muType, randomString);
                b = randomDictionary(3, muType, randomString);
                t.equal(dictionarySchema.equal(a, b), equal(a, b));
            }
        }
    }

    t.end();
});

test('dictionary (flat) - clone()', (t) => {
    for (const muType of muPrimitiveTypes) {
        const valueSchema = muPrimitiveSchema(muType);
        if (valueSchema) {
            const dictSchema = new MuDictionary(valueSchema);

            for (let i = 0; i < 200; ++i) {
                const dict = randomDictionary(1, muType, randomString);
                const copy = dictSchema.clone(dict);

                t.notEquals(copy, dict);
                t.same(copy, dict);
            }
        }
    }

    t.end();
});

test('dictionary (nested) - clone()', (t) => {
    for (const muType of muPrimitiveTypes) {
        const valueSchema = muPrimitiveSchema(muType);
        if (valueSchema) {
            let dictSchema = new MuDictionary(
                new MuDictionary(valueSchema),
            );
            for (let i = 0; i < 100; ++i) {
                const dict = randomDictionary(2, muType, randomString);
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
                const dict = randomDictionary(3, muType, randomString);
                const copy = dictSchema.clone(dict);

                t.notEquals(copy, dict);
                t.same(copy, dict);
            }
        }
    }

    t.end();
});

test('dictionary - copy()', (t) => {
    for (const muType of muPrimitiveTypes) {
        const valueSchema = muPrimitiveSchema(muType);
        if (valueSchema) {
            let source;
            let target;

            let dictionarySchema = new MuDictionary(valueSchema);

            for (let i = 0; i < 10; ++i) {
                source = randomDictionary(1, muType, randomString);
                target = randomDictionary(1, muType, randomString);

                dictionarySchema.copy(source, target);
                t.deepEqual(target, source);
            }

            dictionarySchema = new MuDictionary(
                new MuDictionary(valueSchema),
            );

            for (let i = 0; i < 10; ++i) {
                source = randomDictionary(2, muType, randomString);
                target = randomDictionary(2, muType, randomString);

                dictionarySchema.copy(source, target);
                t.deepEqual(target, source);
            }

            dictionarySchema = new MuDictionary(
                new MuDictionary(
                    new MuDictionary(valueSchema),
                ),
            );

            for (let i = 0; i < 10; ++i) {
                source = randomDictionary(3, muType, randomString);
                target = randomDictionary(3, muType, randomString);

                dictionarySchema.copy(source, target);
                t.deepEqual(target, source);
            }
        }
    }

    t.end();
});

test('dictionary (flat) - diff() & patch()', (t) => {
    for (const muType of muPrimitiveTypes) {
        const valueSchema = muPrimitiveSchema(muType);
        if (valueSchema) {
            const dictSchema = new MuDictionary(valueSchema);

            const testPatchingPair = testPatchingPairFactory(t, dictSchema);

            for (let i = 0; i < 200; ++i) {
                testPatchingPair(
                    randomDictionary(1, muType, randomString),
                    randomDictionary(1, muType, randomString),
                );
            }

            for (let i = 0; i < 200; ++i) {
                // increase the chance of getting properties with the same name
                testPatchingPair(
                    randomDictionary(1, muType, randomShortStr),
                    randomDictionary(1, muType, randomShortStr),
                );
            }

            const testPatching = testPatchingFactory(t, dictSchema);
            const dict = randomDictionary(1, muType, randomString);
            testPatching(dict, dict);
        }
    }

    t.end();
});

test('dictionary (nested) - diff() & patch()', (t) => {
    for (const muType of muPrimitiveTypes) {
        const valueSchema = muPrimitiveSchema(muType);
        if (valueSchema) {
            let dictSchema = new MuDictionary(
                new MuDictionary(valueSchema),
            );
            let testPatchingPair = testPatchingPairFactory(t, dictSchema);
            for (let i = 0; i < 200; ++i) {
                testPatchingPair(
                    randomDictionary(2, muType, randomShortStr),
                    randomDictionary(2, muType, randomShortStr),
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
                    randomDictionary(3, muType, randomShortStr),
                    randomDictionary(3, muType, randomShortStr),
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
                    randomDictionary(4, muType, randomShortStr),
                    randomDictionary(4, muType, randomShortStr),
                );
            }

            const testPatching = testPatchingFactory(t, dictSchema);
            const dict = randomDictionary(4, muType, randomShortStr);
            testPatching(dict, dict);
        }
    }

    t.end();
});
