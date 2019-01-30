import test = require('tape');
import {
    MuBoolean,
    MuUTF8,
    MuFloat32,
    MuDate,
    MuArray,
    MuSortedArray,
    MuVector,
    MuDictionary,
    MuStruct,
    MuUnion,
    MuJSON,
} from '../index';
import { randFloat32 } from '../util/random';

// primitive

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

// date

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

// vector

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
    t.ok(v2 instanceof Float32Array);
    t.deepEqual(v2, v1);
    t.end();
});

// array

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
    t.ok(a2[0] instanceof Float32Array);
    t.deepEqual(a2, a1);
    t.end();
});

// sorted

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

// dictionary

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

// struct

test('struct.toJSON()', (t) => {
    const float32 = new MuFloat32();
    const vector = new MuVector(float32, 1e3);
    const struct = new MuStruct({
        f: float32,
        v: vector,
    });

    const s = struct.alloc();
    t.ok(Array.isArray(struct.toJSON(s).v));
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
    t.ok(s2.v instanceof Float32Array);
    t.deepEqual(s2, s1);
    t.end();
});

// union

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
    t.ok(Array.isArray(union.toJSON(u).data));
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
    t.ok(u2.data instanceof Float32Array);
    t.deepEqual(u2, u1);
    t.end();
});

// json

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
    t.end();
});
