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

test('primitive.assign()', (t) => {
    const bool = new MuBoolean();
    t.equal(bool.assign(true, true), true);
    t.equal(bool.assign(true, false), false);
    t.equal(bool.assign(false, true), true);
    t.equal(bool.assign(false, false), false);

    const float32 = new MuFloat32();
    t.equal(float32.assign(1, 2), 2);
    t.end();
});

test('array.assign()', (t) => {
    const array = new MuArray(new MuFloat32(), Infinity);
    const aSrc = array.alloc();
    const aDst = array.alloc();
    aSrc.push(0);
    t.is(array.assign(aDst, aSrc), aDst);
    t.deepEqual(aDst, [0]);
    aSrc.push(0.5);
    array.assign(aDst, aSrc);
    t.deepEqual(aDst, [0, 0.5]);
    aDst.push(1);
    array.assign(aDst, aSrc);
    t.deepEqual(aDst, [0, 0.5]);

    const nestedArray = new MuArray(
        new MuArray(new MuFloat32(), Infinity),
        Infinity,
    );
    const naSrc = nestedArray.alloc();
    const naDst = nestedArray.alloc();
    naSrc.push([]);
    t.is(nestedArray.assign(naDst, naSrc), naDst);
    t.deepEqual(naDst, [[]]);
    t.isNot(naDst[0], naSrc[0]);
    naSrc.push([0, 0.5]);
    nestedArray.assign(naDst, naSrc);
    t.deepEqual(naDst, [[], [0, 0.5]]);
    t.isNot(naDst[1], naSrc[1]);
    t.end();
});

test('sortedArray.assign()', (t) => {
    const array = new MuSortedArray(new MuFloat32(), Infinity);
    const aSrc = array.alloc();
    const aDst = array.alloc();
    aSrc.push(0);
    t.is(array.assign(aDst, aSrc), aDst);
    t.deepEqual(aDst, [0]);
    aSrc.push(0.5);
    array.assign(aDst, aSrc);
    t.deepEqual(aDst, [0, 0.5]);
    aDst.push(1);
    array.assign(aDst, aSrc);
    t.deepEqual(aDst, [0, 0.5]);

    const nestedArray = new MuSortedArray(
        new MuSortedArray(new MuFloat32(), Infinity),
        Infinity,
    );
    const naSrc = nestedArray.alloc();
    const naDst = nestedArray.alloc();
    naSrc.push([]);
    t.is(nestedArray.assign(naDst, naSrc), naDst);
    t.deepEqual(naDst, [[]]);
    t.isNot(naDst[0], naSrc[0]);
    naSrc.push([0, 0.5]);
    nestedArray.assign(naDst, naSrc);
    t.deepEqual(naDst, [[], [0, 0.5]]);
    t.isNot(naDst[1], naSrc[1]);
    t.end();
});

test('struct.assign()', (t) => {
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

    const s0 = struct.alloc();
    const s1 = struct.alloc();
    s1.struct.ascii = 'a';
    t.equals(struct.assign(s0, s1), s0);
    t.notEquals(struct.assign(s0, s1), s1);
    t.deepEquals(struct.assign(s0, s1), s1);
    t.notEquals(struct.assign(s0, s1).struct, s1.struct);
    s1.struct.fixed = 'a';
    t.deepEquals(struct.assign(s0, s1), s1);
    s1.struct.utf8 = 'Iñtërnâtiônàlizætiøn☃💩';
    t.deepEquals(struct.assign(s0, s1), s1);
    s1.struct.bool = true;
    t.deepEquals(struct.assign(s0, s1), s1);
    s1.struct.float32 = 0.5;
    t.deepEquals(struct.assign(s0, s1), s1);
    s1.struct.float64 = 0.5;
    t.deepEquals(struct.assign(s0, s1), s1);
    s1.struct.int8 = -1;
    t.deepEquals(struct.assign(s0, s1), s1);
    s1.struct.int16 = -1;
    t.deepEquals(struct.assign(s0, s1), s1);
    s1.struct.int32 = -1;
    t.deepEquals(struct.assign(s0, s1), s1);
    s1.struct.uint8 = 1;
    t.deepEquals(struct.assign(s0, s1), s1);
    s1.struct.uint16 = 1;
    t.deepEquals(struct.assign(s0, s1), s1);
    s1.struct.uint32 = 1;
    t.deepEquals(struct.assign(s0, s1), s1);
    s1.struct.varint = 1;
    t.deepEquals(struct.assign(s0, s1), s1);
    s1.struct.rvarint = -1;
    t.deepEquals(struct.assign(s0, s1), s1);
    s1.struct.array.push(0);
    t.deepEquals(struct.assign(s0, s1), s1);
    s1.struct.sorted.push(0);
    t.deepEquals(struct.assign(s0, s1), s1);
    s1.struct.dict['a'] = 0.5;
    t.deepEquals(struct.assign(s0, s1), s1);
    s1.struct.vector[0] = 0.5;
    t.deepEquals(struct.assign(s0, s1), s1);
    s1.struct.union.type = 'b';
    s1.struct.union.data = false;
    t.deepEquals(struct.assign(s0, s1), s1);
    t.end();
});

test('union.assign()', (t) => {
    const stringOrFloat = new MuUnion({
        u: new MuUTF8(),
        f: new MuFloat32(),
    });
    const src = stringOrFloat.alloc();
    const dst = stringOrFloat.alloc();
    src.type = 'u';
    src.data = 'Iñtërnâtiônàlizætiøn☃💩';
    t.is(stringOrFloat.assign(dst, src), dst);
    t.deepEqual(dst, {type: 'u', data: 'Iñtërnâtiônàlizætiøn☃💩'});

    dst.data = 'Internationalization';
    stringOrFloat.assign(dst, src);
    t.deepEqual(dst, {type: 'u', data: 'Iñtërnâtiônàlizætiøn☃💩'});

    src.type = 'f';
    src.data = 0.5;
    stringOrFloat.assign(dst, src);
    t.deepEqual(dst, {type: 'f', data: 0.5});
    stringOrFloat.assign(dst, stringOrFloat.alloc());
    t.deepEqual(dst, stringOrFloat.alloc());

    const union = new MuUnion({
        us: new MuStruct({
            u: new MuUTF8(),
        }),
        fs: new MuStruct({
            f: new MuFloat32(),
        }),
    }, 'us');
    const uSrc = union.alloc();
    const uDst = union.alloc();
    uSrc.type = 'fs';
    uSrc.data = union.muData.fs.alloc();
    t.is(union.assign(uDst, uSrc), uDst);
    t.deepEqual(uDst, {type: 'fs', data: {f: 0}});
    t.isNot(uDst.data, uSrc.data);
    t.end();
});

test('bytes.assign()', (t) => {
    const bytes = new MuBytes();
    const src = new Uint8Array(3);
    const dst = new Uint8Array(3);
    src[1] = 1;
    src[2] = 255;
    t.is(bytes.assign(dst, src), dst);
    t.deepEqual(dst, new Uint8Array([0, 1, 255]));
    t.end();
});

test('dictionary.assign()', (t) => {
    const dictionary = new MuDictionary(new MuFloat32(), Infinity);
    const dSrc = dictionary.alloc();
    const dDst = dictionary.alloc();
    dSrc.a = 0.5;
    t.is(dictionary.assign(dDst, dSrc), dDst);
    t.deepEqual(dDst, {a: 0.5});

    dSrc.b = 1.5;
    dictionary.assign(dDst, dSrc);
    t.deepEqual(dDst, {a: 0.5, b: 1.5});

    dDst.c = 1;
    dictionary.assign(dDst, dSrc);
    t.deepEqual(dDst, {a: 0.5, b: 1.5});

    const nestedDictionary = new MuDictionary(
        new MuDictionary(new MuFloat32(), Infinity),
        Infinity,
    );
    const ndSrc = nestedDictionary.alloc();
    const ndDst = nestedDictionary.alloc();
    ndSrc.a = {};
    t.is(nestedDictionary.assign(ndDst, ndSrc), ndDst);
    t.deepEqual(ndDst, {a: {}});
    t.isNot(ndDst.a, ndSrc.a);

    ndSrc.b = {c: 0.5, d: 1.5};
    nestedDictionary.assign(ndDst, ndSrc);
    t.deepEqual(ndDst, {a: {}, b: {c: 0.5, d: 1.5}});

    ndDst.c = {e: 2.5};
    nestedDictionary.assign(ndDst, ndSrc);
    t.deepEqual(ndDst, {a: {}, b: {c: 0.5, d: 1.5}});
    t.end();
});

test('vector.assign()', (t) => {
    const vector = new MuVector(new MuFloat32(), 2);
    const src = vector.alloc();
    const dst = vector.alloc();
    src[0] = 0.5;
    src[1] = 1.5;
    t.is(vector.assign(dst, src), dst);
    t.deepEqual(dst, new Float32Array([0.5, 1.5]));
    t.end();
});

test('option.assign()', (t) => {

    function doTest<T extends MuSchema<any>>(
        opt:MuOption<T>,
        modify:(x:T['identity']) => T['identity'],
    ) {
        // value to value
        let src = opt.alloc();
        let dst = opt.alloc();
        src = modify(src);
        dst = opt.assign(dst, src);
        t.deepEqual(dst, src);

        // value to undefined
        src = opt.alloc();
        dst = opt.alloc();
        src = undefined;
        dst = opt.assign(dst, src);
        t.deepEqual(dst, src);

        // undefined to value
        src = opt.alloc();
        dst = undefined;
        dst = opt.assign(dst, src);
        t.deepEqual(dst, src);

        // undefined to undefined
        src = undefined;
        dst = undefined;
        dst = opt.assign(dst, src);
        t.deepEqual(dst, src);
    }

    const innerPrimitive = new MuFloat32();
    const optPrimitive = new MuOption(innerPrimitive);
    doTest(optPrimitive, (x) => 20);

    const innerFunctor = new MuVector(innerPrimitive, 2);
    const optFunctor = new MuOption(innerFunctor);

    doTest(optFunctor, (x) => {
        x[0] = 0.5;
        x[1] = 1.5;
        return x;
    });

    // Ensure functor identity is preserved
    const idSrc = optFunctor.alloc();
    let idDst = optFunctor.alloc();
    idSrc[0] = 0.5;
    idSrc[1] = 1.5;
    const idDstOld = idDst;
    idDst = optFunctor.assign(idDst, idSrc);
    t.is(idDst, idDstOld);
    t.deepEqual(idDst, idDstOld);

    t.end();
});

test('date.assign()', (t) => {
    const date = new MuDate();
    const src = date.alloc();
    const dst = date.alloc();
    dst.setTime(0);
    t.is(date.assign(dst, src), dst);
    t.deepEqual(dst, src);
    t.end();
});

test('json.assign', (t) => {
    const json = new MuJSON();
    const o = {a: 0, b: 1};
    const p = {a: {b: {c: [0]}}};
    t.is(json.assign(o, p), o);
    t.deepEqual(o, {a: {b: {c: [0]}}});
    t.isNot(o.a, p.a);

    const q = [0, 1, 2];
    const r = [{}, {}];
    t.is(json.assign(q, r), q);
    t.deepEqual(q, [{}, {}]);
    t.isNot(q[0], r[0]);
    t.end();
});

class MuReference<T> implements MuSchema<T|null> {
    public muType = 'reference';
    public identity:T|null = null;
    public muData = { type: 'reference' };
    public json = { type: 'reference' };

    constructor () { }

    public alloc () : T|null { return null; }
    public free () { }
    public assign (dst:T|null, src:T|null) : T|null { return src; }
    public clone (x) { return x; }
    public equal (a, b) { return a === b; }

    public diff () : never { throw new TypeError('cannot serialize reference'); }
    public patch () : never { throw new TypeError('cannot serialize reference'); }
    public toJSON () : never { throw new TypeError('cannot serialize reference'); }
    public fromJSON () : never { throw new TypeError('cannot serialize reference'); }
}

test('when dst is not reference', (t) => {
    const Human = new MuStruct({
        name: new MuUTF8(),
        power: new MuReference<{
            name:string,
            description:string,
        }>(),
    });

    const mortal = Human.alloc();
    mortal.name = 'Logan';
    const mutant = Human.alloc();
    mutant.name = 'Wolverine';
    mutant.power = {
        name: 'regenerative healing factor',
        description: 'ability to regenerate damaged tissue insanely fast',
    };
    Human.assign(mortal, mutant);
    t.deepEqual(mortal, mutant);
    t.equal(mortal.power, mutant.power);

    t.end();
});
