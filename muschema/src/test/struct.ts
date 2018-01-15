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
    testPatchingPairFactory,
} from './_helper';

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

test('struct - calcByteLength()', (t) => {
    const structSchema = new MuStruct({
        v: new MuFloat64(0.233),
        s: new MuString('foo'),
        b: new MuBoolean(),
    });

    const struct = {
        v: 0.233,
        s: 'foo',
        b: false,
    };

    const numProps = Object.keys(struct).length;
    const BITS_PER_BYTE = 8;
    const trackerBytes = Math.ceil(numProps / BITS_PER_BYTE);
    const dataBytes = 8 + 4 + 3 * 4 + 1;

    t.equals(
        structSchema.calcByteLength(struct),
        trackerBytes + dataBytes,
    );

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
        const rs = new MuReadStream(ws.buffer.buffer);

        t.same(structSchema.patchBinary(identity, rs), struct);

        modifyStruct(struct);

        const testPatchingPair = testPatchingPairFactory(t, structSchema);
        testPatchingPair(identity, struct);

        // get byte length
        t.equals(structSchema.calcByteLength(identity), depth + (depth - 1) * (4 + 6 * 4) + (4 + 4 * 4));
    }

    t.end();
});
