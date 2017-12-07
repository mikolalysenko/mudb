import test = require('tape');

import {
    MuBoolean,
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
} from '../index';
import {
    MuWriteStream,
    MuReadStream,
} from 'mustreams';

import {
    randomString,
    randomValue,
} from './_helper';

test('struct muType', (t) => {
    const struct = new MuStruct({});
    t.equals(struct.muType, 'struct');
    t.end();
});

test('struct muData', (t) => {
    const spec = {
        v: new MuFloat32(),
        vs: new MuVector(new MuFloat32(), 2),
    };
    const struct = new MuStruct(spec);

    t.equals(struct.muData.v, spec.v);
    t.equals(struct.muData.vs, spec.vs);

    t.end();
});

test('struct identity', (t) => {
    const struct = new MuStruct({
        v: new MuFloat64(0.233),
        vs: new MuVector(new MuFloat64(0.233), 2),
        s: new MuString('foo'),
        b: new MuBoolean(),
    });

    t.equals(struct.identity.v, 0.233);
    t.equals(struct.identity.vs.constructor, Float64Array);
    t.equals(struct.identity.s, 'foo');
    t.equals(struct.identity.b, false);

    t.end();
});

test('struct alloc()', (t) => {
    const struct = new MuStruct({
        v: new MuFloat64(0.233),
        vs: new MuVector(new MuFloat64(0.233), 2),
        s: new MuString('foo'),
        b: new MuBoolean(),
    });

    t.equals(typeof struct.alloc().v, 'number');
    t.equals(struct.alloc().vs.constructor, Float64Array);
    t.equals(typeof struct.alloc().s, 'string');
    t.equals(typeof struct.alloc().b, 'boolean');

    t.end();
});

test('struct getByteLength()', (t) => {
    const struct = new MuStruct({
        v: new MuFloat64(0.233),
        vs: new MuVector(new MuFloat64(0.233), 2),
        s: new MuString('foo'),
        b: new MuBoolean(),
    });

    t.equals(struct.getByteLength({ v: 0.233, vs: new Float64Array([0.233, 0.233]), s: 'foo', b: false }), 1 + 8 + 2 * 8 + 4 + 4 * 3 + 1);

    t.end();
});

test('struct diff() & patch()', (t) => {
    const myType2MuSchema = {
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
    };
    const muTypes = Object.keys(myType2MuSchema);
    const muSchemas = muTypes.map((type) => myType2MuSchema[type]);

    function structSpec () {
        const result = {};
        for (const Schema of muSchemas) {
            result[randomString(20)] = new Schema();
        }
        return result;
    }

    for (let i = 0; i < 100; ++i) {
        const spec = structSpec();
        const structSchema = new MuStruct(spec);

        const patch = (structA, structB) => {
            const ws = new MuWriteStream(2);
            structSchema.diffBinary(structA, structB, ws);
            const rs = new MuReadStream(ws);
            return structSchema.patchBinary(structA, rs);
        };

        const testPair = (a, b) => {
            t.same(patch(a, b), b);
            t.same(patch(b, a), a);
        };

        const randomStruct = () => {
            const result = {};

            const propNames = Object.keys(spec);
            const types = propNames.map((name) => spec[name].muType);
            propNames.forEach((name, idx) => {
                result[name] = randomValue(types[idx]);
            });

            return result;
        };

        testPair(randomStruct(), randomStruct());
    }

    t.end();
});

test('nested struct', (t) => {
    function deepStruct(depth:number) {
        if (depth === 2) {
            return new MuStruct({
                type: new MuString('nested'),
                struct: new MuStruct({
                    type: new MuString('flat'),
                }),
            });
        }
        return new MuStruct({
            type: new MuString('nested'),
            struct: deepStruct(--depth),
        });
    }

    function modifyStruct(ds) {
        if (ds.struct) {
            ds.type = 'branch';
            modifyStruct(ds.struct);
        } else {
            ds.type = 'leaf';
        }
    }

    for (let levels = 2; levels < 100; ++levels) {
        const struct = deepStruct(levels);
        const identity = struct.identity;
        const clone = struct.clone(identity);

        t.notEquals(clone, identity);
        t.same(clone, identity);

        let ws = new MuWriteStream(2);
        struct.diffBinary(identity, clone, ws);
        let rs = new MuReadStream(ws);

        t.same(struct.patchBinary(identity, rs), identity);

        modifyStruct(clone);
        ws = new MuWriteStream(2);
        struct.diffBinary(identity, clone, ws);
        rs = new MuReadStream(ws);

        t.same(struct.patchBinary(identity, rs), clone);

        t.equals(struct.getByteLength(identity), levels + (levels - 1) * (4 + 6 * 4) + (4 + 4 * 4));
    }

    t.end();
});
