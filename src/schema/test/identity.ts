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
    t.deepEqual(new MuArray(new MuFloat32()).identity,          []);
    t.deepEqual(new MuSortedArray(new MuFloat32()).identity,    []);
    t.deepEqual(new MuDictionary(new MuFloat32()).identity,     {});
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
    t.deepEqual(
        new MuArray(new MuFloat32(), [0.5, 0.5, 0.5]).identity,
        [0.5, 0.5, 0.5],
    );
    t.deepEqual(
        new MuSortedArray(new MuFloat32(), undefined, [1, 3, 2]).identity,
        [1, 2, 3],
    );
    t.deepEqual(
        new MuDictionary(new MuFloat32(), { x: 0.5, y: 0.5, z: 0.5 }).identity,
        { x: 0.5, y: 0.5, z: 0.5 },
    );
    t.deepEqual(
        new MuUnion({ f: new MuFloat32() }, 'f').identity,
        { type: 'f', data: 0 },
    );
    t.end();
});
