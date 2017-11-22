import * as test from 'tape';

import {
    MuFloat32,
    MuFloat64,
    MuInt32,
    MuUint8,
    MuVector,
} from '../';
import { MuWriteStream, MuReadStream } from 'mustreams';

test('vector identity', (t) => {
    const vec = new MuVector(new MuFloat64(5e-324), 3);

    t.equals(vec.identity.length, 3);
    t.equals(vec.identity[0], 5e-324);

    t.end();
});

test('vector alloc()', (t) => {
    const vec = new MuVector(new MuUint8(), 5);
    const uint8 = vec.alloc();

    t.equals(uint8.constructor, Uint8Array);
    t.equals(uint8.length, 5);

    t.end();
});

test('vector clone()', (t) => {
    const vec = new MuVector(new MuInt32(), 3);
    const int32 = vec.clone(new Int32Array([-3, 0, 3]));

    t.equals(int32.length, 3);
    t.equals(int32[0], -3);
    t.equals(int32[1], 0);
    t.equals(int32[2], 3);

    t.end();
});

test('vector diffBinary()', (t) => {
    const vec = new MuVector(new MuInt32(), 9);

    let ws = new MuWriteStream(2);
    t.false(vec.diffBinary(new Int32Array([0, 0, 0, 0, 0, 0, 0, 0, 0]), new Int32Array([0, 0, 0, 0, 0, 0, 0, 0, 0]), ws));
    let rs = new MuReadStream(ws);
    t.equals(rs.readUint8(), 0);

    ws = new MuWriteStream(2);
    t.true(vec.diffBinary(new Int32Array([0, 0, 0, 0, 0, 0, 0, 0, 0]), new Int32Array([1, 0, 0, 0, 2, 0, 3, 0, 4]), ws));
    rs = new MuReadStream(ws);
    t.equals(rs.readUint8(), 81);
    t.equals(rs.readUint8(), 1);
    t.equals(rs.readUint32(), 1);
    t.equals(rs.readUint32(), 2);
    t.equals(rs.readUint32(), 3);
    t.equals(rs.readUint32(), 4);

    t.end();
});

test('vector patchBinary()', (t) => {
    const vec = new MuVector(new MuFloat32(), 9);

    let ws = new MuWriteStream(2);
    vec.diffBinary(new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]), new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]), ws);
    let rs = new MuReadStream(ws);
    t.deepEquals(vec.patchBinary(new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]), rs), new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]));

    ws = new MuWriteStream(2);
    vec.diffBinary(new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]), new Float32Array([0.1, 0.233, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]), ws);
    rs = new MuReadStream(ws);
    t.deepEquals(vec.patchBinary(new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]), rs), new Float32Array([0.1, 0.233, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]));

    ws = new MuWriteStream(2);
    vec.diffBinary(new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]), new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.999]), ws);
    rs = new MuReadStream(ws);
    t.deepEquals(vec.patchBinary(new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]), rs), new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.999]));

    ws = new MuWriteStream(2);
    vec.diffBinary(new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]), new Float32Array([0.168, 0.233, 0.3344, 0.4416, 0.5525, 0.699, 0.711, 0.888, 0.999]), ws);
    rs = new MuReadStream(ws);
    t.deepEquals(vec.patchBinary(new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]), rs), new Float32Array([0.168, 0.233, 0.3344, 0.4416, 0.5525, 0.699, 0.711, 0.888, 0.999]));

    t.end();
});
