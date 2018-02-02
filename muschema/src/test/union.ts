import test = require('tape');

import {
    MuBoolean,
    MuFloat32,
    MuFloat64,
    MuInt8,
    MuInt16,
    MuInt32,
    MuString,
    MuUint8,
    MuUint16,
    MuUint32,
    MuUnion,
} from '../';

import { muPrimitiveTypes } from '../_constants';
import {
    randomValueOf,
    testPatchingPairFactory,
} from '../_helper';

test('union - identity', (t) => {
    let unionSchema = new MuUnion({
        number: new MuInt8(123),
    });

    t.same(unionSchema.identity, {
        type: '',
        data: void 0,
    });

    unionSchema = new MuUnion(
        {
            number: new MuInt8(123),
        },
        'number',
    );

    t.same(unionSchema.identity, {
        type: 'number',
        data: 123,
    });

    t.end();
});

test('union - alloc()', (t) => {
    const unionSchema = new MuUnion(
        {
            number: new MuInt8(123),
        },
        'number',
    );

    t.same(
        unionSchema.alloc(),
        {
            type: '',
            data: void 0,
        },
    );

    t.end();
});

function randomPairOf (type) {
    return {
        type,
        data: randomValueOf(type),
    };
}

test('union (flat type-data pair) - clone()', (t) => {
    // the spec keys can have arbitrary names
    const schemaSpec = {
        boolean: new MuBoolean(),
        float32: new MuFloat32(),
        float64: new MuFloat64(),
        int8: new MuInt8(),
        int16: new MuInt16(),
        int32: new MuInt32(),
        string: new MuString(),
        uint8: new MuUint8(),
        uint16: new MuUint16(),
        uint32: new MuUint32(),
    };
    const unionSchema = new MuUnion(schemaSpec);

    for (const muType of muPrimitiveTypes) {
        const pair = randomPairOf(muType);
        const copy = unionSchema.clone(pair);

        t.notEquals(copy, pair);
        t.same(copy, pair);
    }

    t.end();
});

test('union (nested type-data pair) - clone()', (t) => {
    const schemaSpec = {
        subType: new MuUnion(
            {
                number: new MuUint8(123),
                text: new MuString('foo'),
            },
            'number',
        ),
    };
    const unionSchema = new MuUnion(schemaSpec, 'subType');

    type TypeName = 'subType';
    type InnerTypeName = 'number' | 'text';
    const pair = {
        type: 'subType' as TypeName,
        data: {
            type: 'number' as InnerTypeName,
            data: 123,
        },
    };
    const copy = unionSchema.clone(pair);

    t.notEquals(copy, pair);
    t.same(copy, pair);

    t.end();
});

test('union (flat type-data pair) - diff() & patch()', (t) => {
    // the spec keys can have arbitrary names
    const schemaSpec = {
        boolean: new MuBoolean(),
        float32: new MuFloat32(),
        float64: new MuFloat64(),
        int8: new MuInt8(),
        int16: new MuInt16(),
        int32: new MuInt32(),
        string: new MuString(),
        uint8: new MuUint8(),
        uint16: new MuUint16(),
        uint32: new MuUint32(),
    };
    const unionSchema = new MuUnion(schemaSpec);

    const testPatchingPair = testPatchingPairFactory(t, unionSchema);

    for (const typeA of muPrimitiveTypes) {
        testPatchingPair(randomPairOf(typeA), randomPairOf(typeA));

        // pair of pairs with different types
        for (const typeB of muPrimitiveTypes) {
            if (typeB === typeA) {
                continue;
            }
            testPatchingPair(randomPairOf(typeA), randomPairOf(typeB));
        }
    }

    t.end();
});

test('union (nested type-data pair) - diff() & patch()', (t) => {
    // the spec keys can have arbitrary names
    const schemaSpec = {
        subType: new MuUnion({
            boolean: new MuBoolean(),
            float32: new MuFloat32(),
            float64: new MuFloat64(),
            int8: new MuInt8(),
            int16: new MuInt16(),
            int32: new MuInt32(),
            string: new MuString(),
            uint8: new MuUint8(),
            uint16: new MuUint16(),
            uint32: new MuUint32(),
        }),
    };
    const unionSchema = new MuUnion(schemaSpec);

    type TypeName = 'subType';
    type InnerTypeName = 'boolean'|'float32'|'float64'|'int8'|'int16'|'int32'|'string'|'uint8'|'uint16'|'uint32';

    const testPatchingPair = testPatchingPairFactory(t, unionSchema);

    for (const typeA of muPrimitiveTypes) {
        // pair of pairs of the same type
        for (let i = 0; i < 200; ++i) {
            const pairA = {
                type: 'subType' as TypeName,
                data: {
                    type: typeA as InnerTypeName,
                    data: randomValueOf(typeA),
                },
            };
            const pairB = {
                type: 'subType' as TypeName,
                data: {
                    type: typeA as InnerTypeName,
                    data: randomValueOf(typeA),
                },
            };
            testPatchingPair(pairA, pairB);
        }

        for (const typeB of muPrimitiveTypes) {
            if (typeA === typeB) {
                continue;
            }

            // pair of pairs of different types
            for (let i = 0; i < 200; ++i) {
                const pairA = {
                    type: 'subType' as TypeName,
                    data: {
                        type: typeA as InnerTypeName,
                        data: randomValueOf(typeA),
                    },
                };
                const pairB = {
                    type: 'subType' as TypeName,
                    data: {
                        type: typeB as InnerTypeName,
                        data: randomValueOf(typeB),
                    },
                };
                testPatchingPair(pairA, pairB);
            }
        }
    }

    t.end();
});
