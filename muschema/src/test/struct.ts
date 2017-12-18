import test = require('tape');

import {
    MuBoolean,
    MuFloat32,
    MuFloat64,
    MuString,
    MuStruct,
    MuVector,
} from '../';
import {
    MuWriteStream,
    MuReadStream,
} from 'mustreams';

import { muPrimitiveTypes } from '../constants';
import {
    muPrimitiveSchema,
    randomStr,
    randomValueOf,
    testPairFactory,
} from './_helper';

test('struct - muData', (t) => {
    const spec = {
        v: new MuFloat32(),
    };
    const struct = new MuStruct(spec);

    t.notEquals(struct.muData, spec);
    t.equals(struct.muData.v, spec.v);

    t.end();
});

test('struct - identity', (t) => {
    const struct = new MuStruct({
        v: new MuFloat64(0.233),
        vs: new MuVector(new MuFloat64(0.233), 2),
        s: new MuString('foo'),
        b: new MuBoolean(),
    });

    t.equals(struct.identity.v, 0.233);
    t.same(struct.identity.vs, [0.233, 0.233]);
    t.equals(struct.identity.s, 'foo');
    t.equals(struct.identity.b, false);

    t.end();
});

test('struct - allocation when the pool is empty', (t) => {
    const struct = new MuStruct({
        v: new MuFloat64(0.233),
        vs: new MuVector(new MuFloat64(0.233), 2),
        s: new MuString('foo'),
        b: new MuBoolean(),
    });

    t.equals(struct.alloc().v, 0.233);
    t.same(struct.alloc().vs, [0.233, 0.233]);
    t.equals(struct.alloc().s, 'foo');
    t.equals(struct.alloc().b, false);

    t.end();
});

test('struct - get byte length', (t) => {
    const struct = new MuStruct({
        v: new MuFloat64(0.233),
        vs: new MuVector(new MuFloat64(0.233), 2),
        s: new MuString('foo'),
        b: new MuBoolean(),
    });

    t.equals(
        struct.calcByteLength({
            v: 0.233,
            vs: new Float64Array([0.233, 0.233]),
            s: 'foo',
            b: false,
        }),
        1 + 8 + 2 * 8 + 4 + 4 * 3 + 1,
    );

    t.end();
});

test('struct - diff and patch flat struct', (t) => {
    function structSpec () {
        const result = {};
        for (const muType of muPrimitiveTypes) {
            result[randomStr()] = muPrimitiveSchema(muType);
        }
        return result;
    }

    for (let i = 0; i < 500; ++i) {
        const spec = structSpec();
        const structSchema = new MuStruct(spec);

        const testPair = testPairFactory(t, structSchema);

        const randomStruct = () => {
            const result = {};

            const propNames = Object.keys(spec);
            const muTypes = propNames.map((name) => spec[name].muType);
            propNames.forEach((propName, idx) => {
                result[propName] = randomValueOf(muTypes[idx]);
            });

            return result;
        };

        testPair(randomStruct(), randomStruct());
    }

    t.end();
});

test('struct - operations on nested struct', (t) => {
    function structSchemaOf (depth:number) : MuStruct<any> {
        if (depth <= 2) {
            return new MuStruct({
                type: new MuString('nested'),
                struct: new MuStruct({
                    type: new MuString('flat'),
                }),
            });
        }

        return new MuStruct({
            type: new MuString('nested'),
            struct: structSchemaOf(depth - 1),
        });
    }

    function modifyStruct (s) {
        if (s.struct) {
            s.type = 'branch';
            modifyStruct(s.struct);
        } else {
            s.type = 'leaf';
        }
    }

    for (let depth = 2; depth < 100; ++depth) {
        const structSchema = structSchemaOf(depth);

        // clone
        const identity = structSchema.identity;
        const struct = structSchema.clone(identity);

        t.notEquals(struct, identity);
        t.same(struct, identity);

        // diff & patch
        const ws = new MuWriteStream(2);
        structSchema.diffBinary(identity, struct, ws);
        const rs = new MuReadStream(ws);

        t.same(structSchema.patchBinary(identity, rs), struct);

        modifyStruct(struct);

        const testPair = testPairFactory(t, structSchema);
        testPair(identity, struct);

        // get byte length
        t.equals(structSchema.calcByteLength(identity), depth + (depth - 1) * (4 + 6 * 4) + (4 + 4 * 4));
    }

    t.end();
});
