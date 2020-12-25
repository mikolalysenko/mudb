import * as test from 'tape';
import {
    MuSchema,
    MuASCII,
    MuFixedASCII,
    MuUTF8,
    MuBoolean,
    MuFloat32,
    MuFloat64,
    MuInt8,
    MuInt16,
    MuInt32,
    MuUint8,
    MuUint16,
    MuUint32,
    MuVarint,
    MuRelativeVarint,
    MuStruct,
    MuArray,
    MuSortedArray,
    MuDictionary,
    MuVector,
    MuUnion,
    MuDate,
    MuJSON,
    MuBytes,
    MuOption,
} from '../index';

test('primitive.clone()', (t) => {
    const bool = new MuBoolean();
    t.equal(bool.clone(true), true);
    t.equal(bool.clone(false), false);

    const utf8 = new MuUTF8();
    t.equal(utf8.clone(''), '');
    t.equal(
        utf8.clone('<a href="https://github.com/mikolalysenko/mudb/">mudb</a>'),
        '<a href="https://github.com/mikolalysenko/mudb/">mudb</a>',
    );
    t.equal(utf8.clone('Iñtërnâtiônàlizætiøn☃💩'), 'Iñtërnâtiônàlizætiøn☃💩');

    const float32 = new MuFloat32();
    t.equal(float32.clone(0), 0);
    t.equal(float32.clone(-0.5), -0.5);
    t.equal(float32.clone(3.1415927410125732), 3.1415927410125732);
    t.end();
});

test('array.clone()', (t) => {
    const array = new MuArray(new MuFloat32(), Infinity);
    let a = array.alloc();
    t.isNot(array.clone(a), a);
    t.deepEqual(array.clone(a), a);
    a = [0.5];
    t.deepEqual(array.clone(a), a);
    a = [0.5, 1.5];
    t.deepEqual(array.clone(a), a);

    const nestedArray = new MuArray(
        new MuArray(new MuFloat32(), Infinity),
        Infinity,
    );
    let na = nestedArray.alloc();
    t.deepEqual(nestedArray.clone(na), na);
    na = [[]];
    t.deepEqual(nestedArray.clone(na), na);
    t.isNot(nestedArray.clone(na)[0], na[0]);
    na = [[0.5]];
    t.deepEqual(nestedArray.clone(na), na);
    na = [[0.5, 1.5]];
    t.deepEqual(nestedArray.clone(na), na);
    na = [[0.5, 1.5], [0.5, 1.5]];
    t.deepEqual(nestedArray.clone(na), na);
    t.end();
});

test('sortedArray.clone()', (t) => {
    const array = new MuSortedArray(new MuFloat32(), Infinity);
    let a = array.alloc();
    t.isNot(array.clone(a), a);
    t.deepEqual(array.clone(a), a);
    a = [0.5];
    t.deepEqual(array.clone(a), a);
    a = [0.5, 1.5];
    t.deepEqual(array.clone(a), a);

    const nestedArray = new MuSortedArray(
        new MuSortedArray(new MuFloat32(), Infinity),
        Infinity,
    );
    let na = nestedArray.alloc();
    t.deepEqual(nestedArray.clone(na), na);
    na = [[]];
    t.deepEqual(nestedArray.clone(na), na);
    t.isNot(nestedArray.clone(na)[0], na[0]);
    na = [[0.5]];
    t.deepEqual(nestedArray.clone(na), na);
    na = [[0.5, 1.5]];
    t.deepEqual(nestedArray.clone(na), na);
    na = [[0.5, 1.5], [0.5, 1.5]];
    t.deepEqual(nestedArray.clone(na), na);
    t.end();
});

test('struct.clone()', (t) => {
    const struct = new MuStruct({
        struct: new MuStruct({
            ascii: new MuASCII(),
            fixed: new MuFixedASCII(1),
            utf8: new MuUTF8(),
            bool: new MuBoolean(),
            float32: new MuFloat32(),
            float64: new MuFloat64(),
            int8: new MuInt8(),
            int16: new MuInt16(),
            int32: new MuInt32(),
            uint8: new MuUint8(),
            uint16: new MuUint16(),
            uint32: new MuUint32(),
            varint: new MuVarint(),
            rvarint: new MuRelativeVarint(),
            array: new MuArray(new MuFloat32(), Infinity),
            sorted: new MuSortedArray(new MuFloat32(), Infinity),
            dict: new MuDictionary(new MuFloat32(), Infinity),
            vector: new MuVector(new MuFloat32(), 3),
            union: new MuUnion({
                b: new MuBoolean(),
                f: new MuFloat32(),
            }),
        }),
    });

    const s = struct.alloc();
    t.notEquals(struct.clone(s), s);
    t.deepEquals(struct.clone(s), s);
    t.notEquals(struct.clone(s).struct, s.struct);

    s.struct.ascii = 'a';
    s.struct.fixed = 'a';
    s.struct.utf8 = 'Iñtërnâtiônàlizætiøn☃💩';
    s.struct.bool = true;
    s.struct.float32 = 0.5;
    s.struct.float64 = 0.5;
    s.struct.int8 = -1;
    s.struct.int16 = -2;
    s.struct.int32 = -3;
    s.struct.uint8 = 1;
    s.struct.uint16 = 2;
    s.struct.uint32 = 3;
    s.struct.varint = 1;
    s.struct.rvarint = -1;
    s.struct.array = [0, 0.5, 1];
    s.struct.sorted = [0, 0.5, 1];
    s.struct.dict = {a: 0, b: 0.5};
    s.struct.vector[1] = 0.5;
    s.struct.vector[2] = 1;
    s.struct.union.type = 'b';
    s.struct.union.data = false;
    t.deepEquals(struct.clone(s), s);
    t.end();
});

test('union.clone()', (t) => {
    const stringOrFloat = new MuUnion({
        u: new MuUTF8(),
        f: new MuFloat32(),
    });
    const sf = stringOrFloat.alloc();
    t.isNot(stringOrFloat.clone(sf), sf);
    t.deepEqual(stringOrFloat.clone(sf), sf);
    sf.type = 'u';
    sf.data = 'Iñtërnâtiônàlizætiøn☃💩';
    t.deepEqual(stringOrFloat.clone(sf), sf);
    sf.type = 'f';
    sf.data = 0.5;
    t.deepEqual(stringOrFloat.clone(sf), sf);

    const union = new MuUnion({
        s: new MuStruct({
            b: new MuBoolean(),
            u: new MuUTF8(),
            f: new MuFloat32(),
        }),
    }, 's');
    const u = union.alloc();
    t.isNot(union.clone(u), u);
    t.isNot(union.clone(u).data, u.data);
    t.deepEqual(union.clone(u), u);
    u.data.b = true;
    u.data.u = 'Iñtërnâtiônàlizætiøn☃💩';
    u.data.f = 0.5;
    t.deepEqual(union.clone(u), u);
    t.end();
});

test('bytes.clone()', (t) => {
    const bytes = new MuBytes();
    const b = new Uint8Array([0, 0, 0]);
    t.deepEqual(bytes.clone(b), b);
    t.isNot(bytes.clone(b), b);
    b[1] = 1;
    b[2] = 255;
    t.deepEqual(bytes.clone(b), b);
    t.end();
});

test('dictionary.clone()', (t) => {
    const dictionary = new MuDictionary(new MuFloat32(), Infinity);
    const d = dictionary.alloc();
    t.isNot(dictionary.clone(d), d);
    t.deepEqual(dictionary.clone(d), d);
    d['a'] = 0.5;
    t.deepEqual(dictionary.clone(d), d);
    d['b'] = 1.5;
    t.deepEqual(dictionary.clone(d), d);

    const nestedDictionary = new MuDictionary(
        new MuDictionary(new MuFloat32(), Infinity),
        Infinity,
    );
    const nd = nestedDictionary.alloc();
    t.deepEqual(nestedDictionary.clone(nd), nd);
    nd['a'] = {f: 0.5};
    t.deepEqual(nestedDictionary.clone(nd), nd);
    t.isNot(nestedDictionary.clone(nd)['a'], nd['a']);
    nd['b'] = {f: 0.5, g: 1.5};
    t.deepEqual(nestedDictionary.clone(nd), nd);
    t.end();
});

test('vector.clone()', (t) => {
    const vector = new MuVector(new MuFloat32(), 2);
    const v = vector.alloc();
    t.isNot(vector.clone(v), v);
    t.deepEqual(vector.clone(v), v);
    v[0] = 0.5;
    v[1] = 1.5;
    t.deepEqual(vector.clone(v), v);
    t.end();
});

test('data.clone()', (t) => {
    const date = new MuDate();
    const moment = date.alloc();
    const instant = date.clone(moment);
    t.deepEqual(moment, instant);
    t.isNot(moment, instant);
    t.end();
});

test('json.clone()', (t) => {
    const json = new MuJSON();
    const o = {a: [{b: [{c: 0}]}]};
    t.deepEqual(json.clone(o), o);
    t.isNot(json.clone(o), o);
    const p = [{a: [{b: [{c: ''}]}]}];
    t.deepEqual(json.clone(p), p);
    t.isNot(json.clone(p), p);
    t.end();
});

test('option.clone()', (t) => {
    function assertPrimitive(mu:MuSchema<any>, value:any) {
        t.deepEqual(value, mu.clone(value));
    }
    function assertFunctor(mu:MuSchema<any>, value:any) {
        const clone = mu.clone(value);
        t.deepEqual(value, clone);
        if (value === undefined && clone === undefined) { return; }
        t.isNot(value, clone);
    }

    const innerPrimitive = new MuFloat32();
    const optPrimitive = new MuOption(innerPrimitive);
    assertPrimitive(optPrimitive, 20);
    assertPrimitive(optPrimitive, undefined);

    const innerStruct = new MuStruct({f: optPrimitive});
    assertFunctor(innerStruct, {f: undefined});
    assertFunctor(innerStruct, {f: 0.5});

    const optStruct = new MuOption(innerStruct);
    assertFunctor(optStruct, {f: undefined});
    assertFunctor(optStruct, {f: 0.5});
    assertFunctor(optStruct, undefined);

    t.end();
});
