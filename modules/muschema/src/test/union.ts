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

import {
    randomValue,
    testPatchingPairFactory,
} from './helper';

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

function randomUnion (type) {
    return {
        type,
        data: randomValue(type),
    };
}

test('union - equal()', (t) => {
    const schemaSpec = {
        uint8: new MuUint8(),
        uint16: new MuUint16(),
    };
    const unionSchema = new MuUnion(schemaSpec);

    const a = randomUnion('uint8');
    const b = { type: a.type, data: a.data };
    t.ok(unionSchema.equal(a, b));

    const c = { type: a.type, data: a.data - 1 };
    t.notOk(unionSchema.equal(a, c));

    const d = randomUnion('uint16');
    d.data = a.data;
    t.notOk(unionSchema.equal(a, d));

    const e = { type: a.type, data: a.data };
    const f = { type: a.type, data: a.data };
    t.ok(unionSchema.equal(e, f));
    delete e.data;
    t.notOk(unionSchema.equal(e, f));
    delete f.data;
    t.notOk(unionSchema.equal(e, f));
    delete e.type;
    delete f.type;
    t.notOk(unionSchema.equal(e, f));

    t.end();
});

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

    for (const muType of Object.keys(schemaSpec)) {
        const pair = randomUnion(muType);
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

    for (const typeA of Object.keys(schemaSpec)) {
        testPatchingPair(randomUnion(typeA), randomUnion(typeA));

        // pair of pairs with different types
        for (const typeB of Object.keys(schemaSpec)) {
            if (typeB === typeA) {
                continue;
            }
            testPatchingPair(randomUnion(typeA), randomUnion(typeB));
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

    for (const typeA of Object.keys(schemaSpec.subType.muData)) {
        // pair of pairs of the same type
        for (let i = 0; i < 200; ++i) {
            const pairA = {
                type: 'subType' as TypeName,
                data: {
                    type: typeA as InnerTypeName,
                    data: randomValue(typeA),
                },
            };
            const pairB = {
                type: 'subType' as TypeName,
                data: {
                    type: typeA as InnerTypeName,
                    data: randomValue(typeA),
                },
            };
            testPatchingPair(pairA, pairB);
        }

        for (const typeB of Object.keys(schemaSpec.subType.muData)) {
            if (typeA === typeB) {
                continue;
            }

            // pair of pairs of different types
            for (let i = 0; i < 200; ++i) {
                const pairA = {
                    type: 'subType' as TypeName,
                    data: {
                        type: typeA as InnerTypeName,
                        data: randomValue(typeA),
                    },
                };
                const pairB = {
                    type: 'subType' as TypeName,
                    data: {
                        type: typeB as InnerTypeName,
                        data: randomValue(typeB),
                    },
                };
                testPatchingPair(pairA, pairB);
            }
        }
    }

    t.end();
});
