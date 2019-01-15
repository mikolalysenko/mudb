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
    MuDate,
    MuArray,
    MuSortedArray,
    MuDictionary,
    MuStruct,
    MuUnion,
    MuVector,
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
    t.true(new MuDate().identity instanceof Date);
    t.deepEqual(new MuArray(new MuFloat32(), 0).identity,       []);
    t.deepEqual(new MuSortedArray(new MuFloat32(), 0).identity, []);
    t.deepEqual(new MuDictionary(new MuFloat32(), 0).identity,  {});
    t.deepEqual(
        new MuStruct({ f: new MuFloat32() }).identity,
        { f: 0 },
    );
    t.deepEqual(
        new MuUnion({ f: new MuFloat32() }).identity,
        { type: '', data: undefined },
    );
    t.deepEqual(
        new MuVector(new MuFloat32(), 3).identity,
        new Float32Array(3),
    );
    t.end();
});

test('schema.identity', (t) => {
    t.equal(new MuBoolean(true).identity,       true);
    t.equal(new MuASCII('skr').identity,        'skr');
    t.equal(new MuUTF8('凉凉').identity,        '凉凉');
    t.equal(new MuFixedASCII(1).identity,       ' ');
    t.equal(new MuFixedASCII('000').identity,   '000');
    t.equal(new MuFloat32(3).identity,          3);
    t.equal(new MuFloat32(3.14).identity,       new Float32Array([3.14])[0]);
    t.equal(new MuFloat64(Math.E).identity,     Math.E);
    t.equal(new MuInt8(-0x80).identity,         -0x80);
    t.equal(new MuInt16(-0x8000).identity,      -0x8000);
    t.equal(new MuInt32(-0x80000000).identity,  -0x80000000);
    t.equal(new MuUint8(0xFF).identity,         0xFF);
    t.equal(new MuUint16(0xFFFF).identity,      0xFFFF);
    t.equal(new MuUint32(0xFFFFFFFF).identity,  0xFFFFFFFF);

    const d = new Date();
    t.deepEqual(new MuDate(d).identity, d);
    t.notEqual(new MuDate(d).identity, d);

    t.deepEqual(
        new MuArray(new MuFloat32(), Infinity, [0.5, 0.5, 0.5]).identity,
        [0.5, 0.5, 0.5],
    );
    t.deepEqual(
        new MuSortedArray(new MuFloat32(), Infinity, undefined, [1, 3, 2]).identity,
        [1, 2, 3],
    );
    t.deepEqual(
        new MuDictionary(new MuFloat32(), Infinity, { x: 0.5, y: 0.5, z: 0.5 }).identity,
        { x: 0.5, y: 0.5, z: 0.5 },
    );
    t.deepEqual(
        new MuUnion({ f: new MuFloat32() }, 'f').identity,
        { type: 'f', data: 0 },
    );
    t.end();
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
