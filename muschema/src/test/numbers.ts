import test = require('tape');

import {
    MuInt8,
    MuInt16,
    MuInt32,
    MuUint8,
    MuUint16,
    MuUint32,
    MuFloat32,
    MuFloat64,
} from '../';
import { MuReadStream, MuWriteStream } from 'mustreams';

const TYPES = [
    MuInt8, MuInt16, MuInt32,
    MuUint8, MuUint16, MuUint32,
    MuFloat32, MuFloat64,
];

const INTS = [
    MuInt8, MuInt16, MuInt32,
    MuUint8, MuUint16, MuUint32,
];

const FLOATS = [
    MuFloat32,
    MuFloat64,
];

const TYPES_TO_CONSTS = {
    int8: { MIN: -0x80, MAX: 0x7F },
    int16: { MIN: -0x8000, MAX: 0x7FFF },
    int32: { MIN: -0x80000000, MAX: 0x7FFFFFFF },
    uint8: { MIN: 0, MAX: 0xFF },
    uint16: { MIN: 0, MAX: 0xFFFF },
    uint32: { MIN: 0, MAX: 0xFFFFFFFF },
    float32: {
        EPSILON: 1.401298464324817e-45,
        MIN: 1.1754943508222875e-38,
        MAX: 3.4028234663852886e+38,
    },
    float64: {
        EPSILON: 5e-324,
        MIN: 2.2250738585072014e-308,
        MAX: 1.7976931348623157e+308,
    },
};

test('alloc() & clone()', (t) => {
    TYPES.forEach((Type) => {
        let n = new Type();

        t.equals(n.identity, 0);
        t.equals(n.alloc(), 0);
        t.equals(n.clone(0), 0);

        const muType = n.muType;
        const minValue = TYPES_TO_CONSTS[muType].MIN;
        const maxValue = TYPES_TO_CONSTS[muType].MAX;

        n = new Type(minValue);

        t.equals(n.identity, minValue);
        t.equals(n.alloc(), minValue);
        t.equals(n.clone(minValue), minValue);

        n = new Type(maxValue);

        t.equals(n.identity, maxValue);
        t.equals(n.alloc(), maxValue);
        t.equals(n.clone(maxValue), maxValue);

        if (muType.indexOf('int') === 0) {
            n = new Type(-1);

            t.equals(n.identity, -1);
            t.equals(n.alloc(), -1);
            t.equals(n.clone(-1), -1);
        }

        if (TYPES_TO_CONSTS[muType]['EPSILON']) {
            const epsilon = TYPES_TO_CONSTS[muType]['EPSILON'];

            n = new Type(-epsilon);

            t.equals(n.identity, -epsilon);
            t.equals(n.alloc(), -epsilon);
            t.equals(n.clone(-epsilon), -epsilon);

            n = new Type(epsilon);

            t.equals(n.identity, epsilon);
            t.equals(n.alloc(), epsilon);
            t.equals(n.clone(epsilon), epsilon);
        }
    });

    t.end();
});

test('diff() & patch()', (t) => {
    INTS.forEach((Type) => {
        const n = new Type();
        const ws = new MuWriteStream(8);

        const smallNum = 1e-8;

        t.equals(n.diffBinary(0, smallNum, ws), false);
        t.equals(n.diffBinary(smallNum, 0, ws), false);
        t.equals(n.diffBinary(0, 1 - smallNum, ws), false);
        t.equals(n.diffBinary(1 - smallNum, 0, ws), false);
    });

    TYPES.forEach((Type) => {
        const n = new Type();
        const ws = new MuWriteStream(8);

        const muType = n.muType;
        const minValue = TYPES_TO_CONSTS[muType].MIN;
        const maxValue = TYPES_TO_CONSTS[muType].MAX;

        t.equals(n.diffBinary(1, minValue, ws), true);
        t.equals(n.diffBinary(1, 0, ws), true);
        t.equals(n.diffBinary(1, maxValue, ws), true);

        const rs = new MuReadStream(ws);

        t.equals(n.patchBinary(1, rs), minValue);
        t.equals(n.patchBinary(1, rs), 0);
        t.equals(n.patchBinary(1, rs), maxValue);
        t.equals(n.patchBinary(1, rs), 1, 'run out of content');
    });

    FLOATS.forEach((Type) => {
        const n = new Type();
        const ws = new MuWriteStream(8);

        const muType = n.muType;
        const epsilon = TYPES_TO_CONSTS[muType].EPSILON;

        t.equals(n.diffBinary(1.0, -epsilon, ws), true);
        t.equals(n.diffBinary(1.0, epsilon, ws), true);

        const rs = new MuReadStream(ws);

        t.equals(n.patchBinary(1.0, rs), -epsilon);
        t.equals(n.patchBinary(1.0, rs), epsilon);
    });

    t.end();
});
