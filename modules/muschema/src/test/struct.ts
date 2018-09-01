import test = require('tape');

import {
    MuBoolean,
    MuUint8,
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
    testPatchingPairFactory,
} from './helper';

test('struct - muData', (t) => {
    const spec = {
        v: new MuFloat32(),
    };
    const structSchema = new MuStruct(spec);

    t.notEquals(structSchema.muData, spec);
    t.equals(structSchema.muData.v, spec.v);

    t.end();
});

test('struct - identity', (t) => {
    const structSchema = new MuStruct({
        v: new MuFloat64(0.233),
        vs: new MuVector(new MuFloat64(0.233), 2),
        s: new MuString('foo'),
        b: new MuBoolean(),
    });

    t.equals(structSchema.identity.v, 0.233);
    t.same(structSchema.identity.vs, [0.233, 0.233]);
    t.equals(structSchema.identity.s, 'foo');
    t.equals(structSchema.identity.b, false);

    t.end();
});

test('struct (flat) - diff() & patch()', (t) => {
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

        const testPatchingPair = testPatchingPairFactory(t, structSchema);

        const randomStruct = () => {
            const result = {};

            const propNames = Object.keys(spec);
            const muTypes = propNames.map((name) => spec[name].muType);
            propNames.forEach((propName, idx) => {
                result[propName] = randomValueOf(muTypes[idx]);
            });

            return result;
        };

        testPatchingPair(randomStruct(), randomStruct());
    }

    t.end();
});

test('struct (nested)', (t) => {
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
        structSchema.diff(identity, struct, ws);
        const rs = new MuReadStream(ws.buffer.uint8);

        t.same(structSchema.patch(identity, rs), struct);

        modifyStruct(struct);

        const testPatchingPair = testPatchingPairFactory(t, structSchema);
        testPatchingPair(identity, struct);
    }

    t.end();
});

test('random test', (t) => {
    const testSchema = new MuStruct({
        a: new MuFloat32(1),
        b: new MuUint8(),
        c: new MuVector(new MuFloat32(), 3),
        foo: new MuString('0'),
    });

    type structT = typeof testSchema['identity'];

    function randomStruct () {
        const result = testSchema.alloc();
        result.a = ((Math.random() * 2) | 0) / 2;
        result.b = (Math.random() * 2) | 0
        result.c = new Float32Array([
            ((Math.random() * 2) | 0) / 2,
            ((Math.random() * 2) | 0) / 2,
            ((Math.random() * 2) | 0) / 2
        ]);
        result.foo = Math.round(Math.random() * 8).toString();
        return result;
    }


    function calcDiff (a:structT, b:structT) : MuReadStream {
        const x = new MuWriteStream(1);
        testSchema.diff(a, b, x);
        return new MuReadStream(x.bytes());
    }

    function testPair (a:structT, b:structT) {
        const x = calcDiff(a, b);
        if (x.length === 0) {
            t.same(a, b, 'structs are equal');
        } else {
            const c = testSchema.patch(a, x);
            t.same(b, c, 'patch ok');
            t.equals(x.length, x.offset, 'offset ok');
        }
    }

    for (let i = 0; i < 100; ++i) {
        const as = randomStruct();
        const bs = randomStruct();
        testPair(as, bs);
        testPair(bs, as);
        testPair(testSchema.identity, as);
        testPair(testSchema.identity, bs);
    }

    t.end();
});
