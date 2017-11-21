import * as test from 'tape';

import {
    MuFloat64,
    MuInt32,
    MuUint8,
    MuVector,
} from '../';
import { MuWriteStream, MuReadStream } from 'mustreams';
import { MuFloat32 } from '../float32';

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
    const vec = new MuVector(new MuInt32(), 5);

    let ws = new MuWriteStream(2);
    t.false(vec.diffBinary(new Int32Array([0, 0, 0, 0, 0]), new Int32Array([0, 0, 0, 0, 0]), ws));
    let rs = new MuReadStream(ws);
    t.equals(rs.readUint32(), 0);

    ws = new MuWriteStream(2);
    t.true(vec.diffBinary(new Int32Array([0, 0, 0, 0, 0]), new Int32Array([-5, 0, 0, 0, 5]), ws));
    rs = new MuReadStream(ws);
    t.equals(rs.readUint32(), 2);

    t.end();
});

test('vector patchBinary()', (t) => {
    const vec = new MuVector(new MuFloat64(), 3);

    let ws = new MuWriteStream(2);
    vec.diffBinary(new Float64Array([0.1, 0.2, 0.3]), new Float64Array([0.1, 0.2, 0.3]), ws);
    let rs = new MuReadStream(ws);
    t.deepEquals(vec.patchBinary(new Float64Array([0.1, 0.2, 0.3]), rs), new Float64Array([0.1, 0.2, 0.3]));

    ws = new MuWriteStream(2);
    vec.diffBinary(new Float64Array([0.1, 0.2, 0.3]), new Float64Array([0.1, 0.233, 0.3]), ws);
    rs = new MuReadStream(ws);
    t.deepEquals(vec.patchBinary(new Float64Array([0.1, 0.2, 0.3]), rs), new Float64Array([0.1, 0.233, 0.3]));

    ws = new MuWriteStream(2);
    vec.diffBinary(new Float64Array([0.1, 0.2, 0.3]), new Float64Array([0.168, 0.233, 0.377]), ws);
    rs = new MuReadStream(ws);
    t.deepEquals(vec.patchBinary(new Float64Array([0.1, 0.2, 0.3]), rs), new Float64Array([0.168, 0.233, 0.377]));

    t.end();
});
