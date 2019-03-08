import test = require('tape');
import {
    MuVoid,
    MuBoolean,
    MuASCII,
    MuFixedASCII,
    MuUTF8,
    MuFloat32,
    MuFloat64,
    MuInt8,
    MuInt16,
    MuInt32,
    MuUint8,
    MuUint16,
    MuUint32,
    MuArray,
    MuSortedArray,
    MuStruct,
    MuUnion,
    MuBytes,
    MuDictionary,
    MuVector,
    MuDate,
    MuJSON,
} from '../index';

test('schema.identity default', (t) => {
    t.equal(new MuVoid().identity,      undefined);
    t.equal(new MuBoolean().identity,   false);
    t.equal(new MuASCII().identity,     '');
    t.equal(new MuUTF8().identity,      '');
    t.equal(new MuFloat32().identity,   0);
    t.equal(new MuFloat64().identity,   0);
    t.equal(new MuInt8().identity,      0);
    t.equal(new MuInt16().identity,     0);
    t.equal(new MuInt32().identity,     0);
    t.equal(new MuUint8().identity,     0);
    t.equal(new MuUint16().identity,    0);
    t.equal(new MuUint32().identity,    0);
    t.deepEqual(new MuArray(new MuFloat32(), 0).identity,       []);
    t.deepEqual(new MuSortedArray(new MuFloat32(), 0).identity, []);
    t.deepEqual(new MuStruct({ f: new MuFloat32() }).identity,  { f: 0 });
    t.deepEqual(new MuUnion({ f: new MuFloat32() }).identity,   { type: '', data: undefined });
    t.deepEqual(new MuBytes().identity,                         new Uint8Array(1));
    t.deepEqual(new MuDictionary(new MuFloat32(), 0).identity,  {});
    t.deepEqual(new MuVector(new MuFloat32(), 3).identity,      new Float32Array(3));
    t.true(new MuDate().identity instanceof Date);
    t.end();
});

test('schema.identity', (t) => {
    t.equal(new MuBoolean(true).identity,       true);
    t.equal(new MuASCII('skr').identity,        'skr');
    t.equal(new MuUTF8('Iñtërn').identity,      'Iñtërn');
    t.equal(new MuFixedASCII(1).identity,       ' ');
    t.equal(new MuFixedASCII(2).identity,       '  ');
    t.equal(new MuFixedASCII('000').identity,   '000');
    t.equal(new MuFloat32(3).identity,          3);
    t.equal(new MuFloat64(Math.E).identity,     Math.E);
    t.equal(new MuInt8(-0x80).identity,         -0x80);
    t.equal(new MuInt16(-0x8000).identity,      -0x8000);
    t.equal(new MuInt32(-0x80000000).identity,  -0x80000000);
    t.equal(new MuUint8(0xFF).identity,         0xFF);
    t.equal(new MuUint16(0xFFFF).identity,      0xFFFF);
    t.equal(new MuUint32(0xFFFFFFFF).identity,  0xFFFFFFFF);

    const a = [{}, {}];
    const array = new MuArray(new MuDictionary(new MuFloat32(), Infinity), Infinity, a);
    t.deepEqual(array.identity, a);
    t.isNot(array.identity, a);
    t.isNot(array.identity[0], a[0]);

    const sa = [1, 3, 2];
    const sortedArray = new MuSortedArray(new MuFloat32(), Infinity, undefined, sa);
    t.deepEqual(sortedArray.identity, [1, 2, 3]);
    t.isNot(sortedArray.identity, sa);

    const union = new MuUnion({ f: new MuFloat32() }, 'f');
    t.deepEqual(union.identity, { type: 'f', data: 0 });

    const b = new Uint8Array([0, 1, 2]);
    const bytes = new MuBytes(b);
    t.deepEqual(bytes.identity, b);
    t.isNot(bytes.identity, b);

    const dict = {x: [], y: []};
    const dictionary = new MuDictionary(new MuArray(new MuFloat32(), Infinity), Infinity, dict);
    t.deepEqual(dictionary.identity, dict);
    t.isNot(dictionary.identity, dict);
    t.isNot(dictionary.identity.x, dict.x);

    const vector = new MuVector(new MuFloat32(1), 3);
    t.deepEqual(vector.identity, new Float32Array([1, 1, 1]));
    t.end();

    const d = new Date();
    const date = new MuDate(d);
    t.deepEqual(date.identity, d);
    t.isNot(date.identity, d);

    const o = {n: 0, b: false, a: []};
    const json = new MuJSON(o);
    t.deepEqual(json.identity, o);
    t.isNot(json.identity, o);
    t.isNot(json.identity['a'], o['a']);
});

test('setting number type identity', (t) => {
    t.doesNotThrow(() => new MuFloat32(-3.4e+38));
    t.doesNotThrow(() => new MuFloat32(3.4e+38));
    t.doesNotThrow(() => new MuFloat64(-1.7e+308));
    t.doesNotThrow(() => new MuFloat64(1.7e308));
    t.doesNotThrow(() => new MuInt8(-0x80));
    t.doesNotThrow(() => new MuInt8(0x7F));
    t.doesNotThrow(() => new MuInt16(-0x8000));
    t.doesNotThrow(() => new MuInt16(0x7FFF));
    t.doesNotThrow(() => new MuInt32(-0x80000000));
    t.doesNotThrow(() => new MuInt32(0x7FFFFFFF));
    t.doesNotThrow(() => new MuUint8(0));
    t.doesNotThrow(() => new MuUint8(0xFF));
    t.doesNotThrow(() => new MuUint16(0));
    t.doesNotThrow(() => new MuUint16(0xFFFF));
    t.doesNotThrow(() => new MuUint32(0));
    t.doesNotThrow(() => new MuUint32(0xFFFFFFFF));

    t.throws(() => new MuFloat32(-3.41e+38),    RangeError);
    t.throws(() => new MuFloat32(3.41e+38),     RangeError);
    t.throws(() => new MuFloat64(-1.8e+308),    RangeError);
    t.throws(() => new MuFloat64(1.8e+308),     RangeError);
    t.throws(() => new MuInt8(-0x81),           RangeError);
    t.throws(() => new MuInt8(0x80),            RangeError);
    t.throws(() => new MuInt16(-0x8001),        RangeError);
    t.throws(() => new MuInt16(0x8000),         RangeError);
    t.throws(() => new MuInt32(-0x80000001),    RangeError);
    t.throws(() => new MuInt32(0x80000000),     RangeError);
    t.throws(() => new MuUint8(-1),             RangeError);
    t.throws(() => new MuUint8(0x100),          RangeError);
    t.throws(() => new MuUint16(-1),            RangeError);
    t.throws(() => new MuUint16(0x10000),       RangeError);
    t.throws(() => new MuUint32(-1),            RangeError);
    t.throws(() => new MuUint32(0x100000000),   RangeError);
    t.end();
});
