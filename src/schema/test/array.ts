import test = require('tape');
import equal = require('fast-deep-equal');

import {
    MuArray,
    MuFloat64,
    MuUTF8,
    MuUint32,
} from '../';

import {
    muType2TypedArray,
    muPrimitiveTypes,
} from '../constants';
import {
    muPrimitiveSchema,
    randomValue,
    testPatchingFactory,
    testPatchingPairFactory,
} from './helper';

test('array - identity', (t) => {
    let arraySchema = new MuArray(new MuUTF8());
    t.same(arraySchema.identity, []);

    const id = ['foo', 'bar'];
    arraySchema = new MuArray(new MuUTF8(), id);
    t.equals(arraySchema.identity, id);

    t.end();
});

test('array - alloc()', (t) => {
    let arraySchema = new MuArray(new MuFloat64());
    t.same(arraySchema.alloc(), []);

    arraySchema = new MuArray(
        new MuUint32(),
        [233, 666],
    );
    t.same(arraySchema.alloc(), []);

    t.end();
});

function randomArray (dimension, muType, length_?:number) {
    const length = length_ || Math.random() * 10 | 0;
    const result = new Array(length);

    if (dimension === 1) {
        for (let i = 0; i < length; ++i) {
            result[i] = randomValue(muType);
        }
        return result;
    }

    for (let i = 0; i < length; ++i) {
        result[i] = randomArray(dimension - 1, muType, length_);
    }
    return result;
}

test('array (flat) - clone()', (t) => {
    for (const muType of muPrimitiveTypes) {
        const valueSchema = muPrimitiveSchema(muType);
        if (valueSchema) {
            const arraySchema = new MuArray(valueSchema);

            for (let i = 0; i < 200; ++i) {
                const arr = randomArray(1, muType);
                const copy = arraySchema.clone(arr);

                t.notEquals(copy, arr);
                t.same(copy, arr);
            }
        }
    }

    t.end();
});

test('array (nested) - clone()', (t) => {
    for (const muType of muPrimitiveTypes) {
        const valueSchema = muPrimitiveSchema(muType);
        if (valueSchema) {
            let arraySchema = new MuArray(
                new MuArray(valueSchema),
            );
            for (let i = 0; i < 100; ++i) {
                const array2D = randomArray(2, muType);
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
                const array3D = randomArray(3, muType);
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
                const array4D = randomArray(4, muType);
                const copy = arraySchema.clone(array4D);

                t.notEquals(copy, array4D);
                t.same(copy, array4D);
            }
        }
    }

    t.end();
});

test('array - copy()', (t) => {
    for (const muType of muPrimitiveTypes) {
        const valueSchema = muPrimitiveSchema(muType);
        if (valueSchema) {
            let source:any[];
            let target:any[];

            let arraySchema = new MuArray(valueSchema);

            for (let i = 0; i < 10; ++i) {
                source = randomArray(1, muType);
                target = randomArray(1, muType);

                arraySchema.copy(source, target);
                t.deepEqual(target, source);
            }

            arraySchema = new MuArray(
                new MuArray(valueSchema),
            );

            for (let i = 0; i < 10; ++i) {
                source = randomArray(2, muType);
                target = randomArray(2, muType);

                arraySchema.copy(source, target);
                t.deepEqual(target, source);
            }

            arraySchema = new MuArray(
                new MuArray(
                    new MuArray(valueSchema),
                ),
            );

            for (let i = 0; i < 10; ++i) {
                source = randomArray(3, muType);
                target = randomArray(3, muType);

                arraySchema.copy(source, target);
                t.deepEqual(target, source);
            }
        }
    }

    t.end();
});

test('array - equal()', (t) => {
    for (const muType of muPrimitiveTypes) {
        const valueSchema = muPrimitiveSchema(muType);
        if (valueSchema) {
            const arraySchema = new MuArray(valueSchema);

            t.ok(arraySchema.equal([], []));

            const array = randomArray(1, muType);
            t.ok(arraySchema.equal(arraySchema.clone(array), array));

            let a = randomArray(1, muType, 5);
            let b = randomArray(1, muType, 5);
            t.equal(arraySchema.equal(a, b), equal(a, b));

            for (let i = 0; i < 10; ++i) {
                a = randomArray(1, muType);
                b = randomArray(1, muType);
                t.equal(arraySchema.equal(a, b), equal(a, b));
            }
        }
    }

    for (const muType of muPrimitiveTypes) {
        const valueSchema = muPrimitiveSchema(muType);
        if (valueSchema) {
            const arraySchema = new MuArray(
                new MuArray(valueSchema),
            );

            t.ok(arraySchema.equal([], []));

            const array = randomArray(2, muType);
            t.ok(arraySchema.equal(arraySchema.clone(array), array));

            let a = randomArray(2, muType, 5);
            let b = randomArray(2, muType, 5);
            t.equal(arraySchema.equal(a, b), equal(a, b));

            for (let i = 0; i < 10; ++i) {
                a = randomArray(2, muType);
                b = randomArray(2, muType);
                t.equal(arraySchema.equal(a, b), equal(a, b));
            }
        }
    }

    for (const muType of muPrimitiveTypes) {
        const valueSchema = muPrimitiveSchema(muType);
        if (valueSchema) {
            const arraySchema = new MuArray(
                new MuArray(
                    new MuArray(valueSchema),
                ),
            );

            t.ok(arraySchema.equal([], []));

            const array = randomArray(3, muType);
            t.ok(arraySchema.equal(arraySchema.clone(array), array));

            let a = randomArray(3, muType, 5);
            let b = randomArray(3, muType, 5);
            t.equal(arraySchema.equal(a, b), equal(a, b));

            for (let i = 0; i < 10; ++i) {
                a = randomArray(3, muType);
                b = randomArray(3, muType);
                t.equal(arraySchema.equal(a, b), equal(a, b));
            }
        }
    }

    t.end();
});

test('array (flat) - diff() & patch()', (t) => {
    for (const muType of muPrimitiveTypes) {
        const valueSchema = muPrimitiveSchema(muType);
        if (valueSchema) {
            const arraySchema = new MuArray(valueSchema);

            const testPatching = testPatchingFactory(t, arraySchema);
            const arr = randomArray(1, muType);
            testPatching(arr, arr);

            const testPatchingPair = testPatchingPairFactory(t, arraySchema);
            for (let i = 0; i < 200; ++i) {
                testPatchingPair(
                    randomArray(1, muType),
                    randomArray(1, muType),
                );
            }
        }
    }

    t.end();
});

test('array (nested) - diff() & patch()', (t) => {
    for (const muType of muPrimitiveTypes) {
        const valueSchema = muPrimitiveSchema(muType);
        if (valueSchema) {
            let arraySchema = new MuArray(
                new MuArray(valueSchema),
            );

            let testPatchingPair = testPatchingPairFactory(t, arraySchema);
            for (let i = 0; i < 200; ++i) {
                testPatchingPair(
                    randomArray(2, muType),
                    randomArray(2, muType),
                );
            }

            arraySchema = new MuArray(
                new MuArray(
                    new MuArray(valueSchema),
                ),
            );
            testPatchingPair = testPatchingPairFactory(t, arraySchema);
            for (let i = 0; i < 200; ++i) {
                testPatchingPair(
                    randomArray(3, muType),
                    randomArray(3, muType),
                );
            }

            arraySchema = new MuArray(
                new MuArray(
                    new MuArray(
                        new MuArray(valueSchema),
                    ),
                ),
            );
            testPatchingPair = testPatchingPairFactory(t, arraySchema);
            for (let i = 0; i < 200; ++i) {
                testPatchingPair(
                    randomArray(4, muType),
                    randomArray(4, muType),
                );
            }

            const testPatching = testPatchingFactory(t, arraySchema);
            const arr = randomArray(4, muType);
            testPatching(arr, arr);
        }
    }

    t.end();
});
