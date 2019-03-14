import test = require('tape');
import {
    MuBoolean,
    MuUTF8,
    MuFloat32,
    MuArray,
    MuOption,
    MuSortedArray,
    MuStruct,
    MuUnion,
    MuBytes,
    MuDictionary,
    MuVector,
    MuDate,
    MuJSON,
} from '../index';
import { randFloat32, randUint8 } from '../util/random';

test('primitive.toJSON()', (t) => {
    const bool = new MuBoolean();
    t.equal(bool.toJSON(false), false);
    t.equal(bool.toJSON(true), true);

    const utf8 = new MuUTF8();
    t.equal(utf8.toJSON(''), '');
    t.equal(utf8.toJSON('Iñtërnâtiônàlizætiøn☃💩'), 'Iñtërnâtiônàlizætiøn☃💩');

    const float32 = new MuFloat32();
    t.equal(float32.toJSON(0), 0);
    t.equal(float32.toJSON(0.5), 0.5);
    t.end();
});

test('primitive.fromJSON()', (t) => {
    const bool = new MuBoolean();
    t.equal(bool.fromJSON(bool.toJSON(false)), false);
    t.equal(bool.fromJSON(bool.toJSON(true)), true);

    const utf8 = new MuUTF8();
    t.equal(utf8.fromJSON(utf8.toJSON('')), '');
    t.equal(utf8.fromJSON(utf8.toJSON('Iñtërnâtiônàlizætiøn☃💩')), 'Iñtërnâtiônàlizætiøn☃💩');

    const float32 = new MuFloat32();
    t.equal(float32.fromJSON(float32.toJSON(0)), 0);
    t.equal(float32.fromJSON(float32.toJSON(0.5)), 0.5);
    t.end();
});

test('array.toJSON()', (t) => {
    const array = new MuArray(new MuFloat32(), Infinity);

    const a = array.alloc();
    t.notEqual(array.toJSON(a), a);
    t.deepEqual(array.toJSON(a), a);

    for (let i = 0; i < 1e3; ++i) {
        a.push(randFloat32());
    }
    t.notEqual(array.toJSON(a), a);
    t.deepEqual(array.toJSON(a), a);
    t.end();
});

test('array.fromJSON()', (t) => {
    const array = new MuArray(new MuFloat32(), Infinity);

    const a = array.alloc();
    const j1 = array.toJSON(a);
    t.notEqual(array.fromJSON(j1), j1);
    t.deepEqual(array.fromJSON(j1), a);

    for (let i = 0; i < 1e3; ++i) {
        a.push(randFloat32());
    }
    const j2 = array.toJSON(a);
    t.notEqual(array.fromJSON(j2), j2);
    t.deepEqual(array.fromJSON(j2), a);
    t.end();
});

test('array.toJSON()', (t) => {
    const vector = new MuVector(new MuFloat32(), 1e3);
    const array = new MuArray(vector, Infinity);

    const a1 = new Array(10);
    const a2 = new Array(a1.length);
    for (let i = 0; i < a1.length; ++i) {
        a1[i] = vector.alloc();
        a2[i] = new Array(vector.dimension);
        for (let j = 0; j < a1[i].length; ++j) {
            a2[i][j] = a1[i][j] = randFloat32();
        }
    }

    t.deepEqual(array.toJSON(a1), a2);
    t.end();
});

test('array.fromJSON()', (t) => {
    const vector = new MuVector(new MuFloat32(), 1e3);
    const array = new MuArray(vector, Infinity);

    const a1 = new Array(10);
    for (let i = 0; i < a1.length; ++i) {
        a1[i] = vector.alloc();
        for (let j = 0; j < a1[i].length; ++j) {
            a1[i][j] = randFloat32();
        }
    }

    const a2 = array.fromJSON(array.toJSON(a1));
    t.equal(a2.length, a1.length);
    t.true(a2[0] instanceof Float32Array);
    t.deepEqual(a2, a1);
    t.end();
});

test('sorted.toJSON()', (t) => {
    const sorted = new MuSortedArray(new MuFloat32(), Infinity);

    const s = sorted.alloc();
    t.notEqual(sorted.toJSON(s), s);
    t.deepEqual(sorted.toJSON(s), s);

    for (let i = 0; i < 1e3; ++i) {
        s.push(randFloat32());
    }
    t.notEqual(sorted.toJSON(s), s);
    t.deepEqual(sorted.toJSON(s), s);
    t.end();
});

test('sorted.fromJSON()', (t) => {
    const sorted = new MuSortedArray(new MuFloat32(), Infinity);

    const s = sorted.alloc();
    const j1 = sorted.toJSON(s);
    t.notEqual(sorted.fromJSON(j1), j1);
    t.deepEqual(sorted.fromJSON(j1), s);

    for (let i = 0; i < 1e3; ++i) {
        s.push(randFloat32());
    }
    const j2 = sorted.toJSON(s);
    t.notEqual(sorted.fromJSON(j2), j2);
    t.deepEqual(sorted.fromJSON(j2), s);
    t.end();
});

test('struct.toJSON()', (t) => {
    const float32 = new MuFloat32();
    const vector = new MuVector(float32, 1e3);
    const struct = new MuStruct({
        f: float32,
        v: vector,
    });

    const s = struct.alloc();
    t.true(Array.isArray(struct.toJSON(s).v));
    t.deepEqual(struct.toJSON(s), {
        f: float32.toJSON(float32.alloc()),
        v: vector.toJSON(vector.alloc()),
    });

    const o:any = {};
    o.f = s.f = randFloat32();
    o.v = new Array(s.v.length);
    for (let i = 0; i < s.v.length; ++i) {
        o.v[i] = s.v[i] = randFloat32();
    }
    t.deepEqual(struct.toJSON(s), o);

    t.end();
});

test('struct.fromJSON()', (t) => {
    const float32 = new MuFloat32();
    const vector = new MuVector(float32, 1e3);
    const struct = new MuStruct({
        f: float32,
        v: vector,
    });

    const s1 = struct.alloc();
    s1.f = randFloat32();
    for (let i = 0; i < s1.v.length; ++i) {
        s1.v[i] = randFloat32();
    }

    const s2 = struct.fromJSON(struct.toJSON(s1));
    t.true(s2.v instanceof Float32Array);
    t.deepEqual(s2, s1);
    t.end();
});

test('union.toJSON()', (t) => {
    const union = new MuUnion(
        {
            f: new MuFloat32(),
            v: new MuVector(new MuFloat32(), 1e3),
        },
        'f',
    );

    const u = union.alloc();
    u.data = randFloat32();
    t.notEqual(union.toJSON(u), u);
    t.deepEqual(union.toJSON(u), u);

    u.type = 'v';
    u.data = union.muData[u.type].alloc();
    const a = new Array(u.data.length);
    for (let i = 0; i < u.data.length; ++i) {
        a[i] = u.data[i] = randFloat32();
    }
    t.true(Array.isArray(union.toJSON(u).data));
    t.deepEqual(union.toJSON(u), {
        type: u.type,
        data: a,
    });
    t.end();
});

test('union.fromJSON()', (t) => {
    const union = new MuUnion(
        {
            f: new MuFloat32(),
            v: new MuVector(new MuFloat32(), 1e3),
        },
        'v',
    );

    const u1 = union.alloc();
    for (let i = 0; i < 1e3; ++i) {
        u1.data[i] = randFloat32();
    }
    const u2 = union.fromJSON(union.toJSON(u1));
    t.true(u2.data instanceof Float32Array);
    t.deepEqual(u2, u1);
    t.end();
});

test('bytes.toJSON()', (t) => {
    const bytes = new MuBytes();
    const a = new Array(100);
    for (let i = 0; i < a.length; ++i) {
        a[i] = randUint8();
    }
    const b = new Uint8Array(a);
    t.deepEqual(bytes.toJSON(b), a);
    t.end();
});

test('bytes.fromJSON()', (t) => {
    const bytes = new MuBytes();
    const b = new Uint8Array(100);
    for (let i = 0; i < b.length; ++i) {
        b[i] = randUint8();
    }
    t.deepEqual(bytes.fromJSON(bytes.toJSON(b)), b);
    t.end();
});

test('dictionary.toJSON()', (t) => {
    const dictionary = new MuDictionary(new MuFloat32(), Infinity);

    const d = dictionary.alloc();
    t.notEqual(dictionary.toJSON(d), d);
    t.deepEqual(dictionary.toJSON(d), d);

    let code = 97;
    for (let i = 0; i < 26; ++i) {
        d[String.fromCharCode(code++)] = randFloat32();
    }
    t.notEqual(dictionary.toJSON(d), d);
    t.deepEqual(dictionary.toJSON(d), d);
    t.end();
});

test('dictionary.fromJSON()', (t) => {
    const dictionary = new MuDictionary(new MuFloat32(), Infinity);

    const d = dictionary.alloc();
    const j1 = dictionary.toJSON(d);
    t.notEqual(dictionary.fromJSON(j1), j1);
    t.deepEqual(dictionary.fromJSON(j1), d);

    let code = 97;
    for (let i = 0; i < 26; ++i) {
        d[String.fromCharCode(code++)] = randFloat32();
    }
    const j2 = dictionary.toJSON(d);
    t.notEqual(dictionary.fromJSON(j2), j2);
    t.deepEqual(dictionary.fromJSON(j2), d);
    t.end();
});

test('vector.toJSON()', (t) => {
    const vector = new MuVector(new MuFloat32(), 1e3);
    const v = vector.alloc();

    const a = new Array(v.length);
    for (let i = 0; i < a.length; ++i) {
        a[i] = v[i] = randFloat32();
    }
    t.deepEqual(vector.toJSON(v), a);
    t.end();
});

test('vector.fromJSON()', (t) => {
    const vector = new MuVector(new MuFloat32(), 1e3);
    const v1 = vector.alloc();
    for (let i = 0; i < v1.length; ++i) {
        v1[i] = randFloat32();
    }

    const v2 = vector.fromJSON(vector.toJSON(v1));
    t.true(v2 instanceof Float32Array);
    t.deepEqual(v2, v1);
    t.end();
});

test('date.toJSON()', (t) => {
    const date = new MuDate();
    const d = date.alloc();
    t.equal(date.toJSON(d), d.toISOString());
    t.end();
});

test('date.fromJSON()', (t) => {
    const date = new MuDate();
    const d = date.alloc();
    t.deepEqual(date.fromJSON(date.toJSON(d)), d);
    t.notEqual(date.fromJSON(date.toJSON(d)), d);
    t.end();
});

test('json.toJSON()', (t) => {
    const json = new MuJSON();
    const o = {};
    t.equal(json.toJSON(o), o);
    t.end();
});

test('json.fromJSON()', (t) => {
    const json = new MuJSON();
    const o = {};
    t.equal(json.fromJSON(json.toJSON(o)), o);
    const o2 = {a: 1234};
    t.equal(json.fromJSON(json.toJSON(o2)), o2);
    t.end();
});

test('option.toJSON()', (t) => {
    const op = new MuOption(new MuFloat32()); // optional primitive
    const of = new MuOption(new MuStruct({op: op})); // optional functor

    t.equal(op.toJSON(undefined), undefined);
    t.equal(op.toJSON(4), 4);

    t.equal(of.toJSON(undefined), undefined);
    t.deepEqual(of.toJSON({op: undefined}), {op: undefined});
    t.deepEqual(of.toJSON({op: 4}), {op: 4});

    t.end();
});

test('option.fromJSON()', (t) => {
    const op = new MuOption(new MuFloat32()); // optional primitive
    const of = new MuOption(new MuStruct({op: op})); // optional functor

    t.equal(op.fromJSON(op.toJSON(undefined)), undefined);
    t.equal(op.fromJSON(op.toJSON(4)), 4);

    t.equal(of.fromJSON(of.toJSON(undefined)), undefined);
    t.deepEqual(of.fromJSON(of.toJSON({op: undefined})), {op: undefined});
    t.deepEqual(of.fromJSON(of.toJSON({op: 4})), {op: 4});

    t.end();
});
