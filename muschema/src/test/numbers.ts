import test = require('tape');
import CONSTANTS = require('../constants');

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

test('alloc() & clone()', (t) => {
    TYPES.forEach((Type) => {
        const defaultValue = 0;
        let n = new Type();

        t.equals(n.identity, defaultValue);
        t.equals(n.alloc(), defaultValue);
        t.equals(n.clone(0), 0);

        const muType = n.muType;
        const min = CONSTANTS[muType].MIN;
        const max = CONSTANTS[muType].MAX;

        n = new Type(min);

        t.equals(n.identity, min);
        t.equals(n.alloc(), min);
        t.equals(n.clone(min), min);

        n = new Type(max);

        t.equals(n.identity, max);
        t.equals(n.alloc(), max);
        t.equals(n.clone(max), max);

        if (muType.indexOf('int') === 0) {
            n = new Type(-1);

            t.equals(n.identity, -1);
            t.equals(n.alloc(), -1);
            t.equals(n.clone(-1), -1);
        }

        if (CONSTANTS[muType]['EPSILON']) {
            const epsilon = CONSTANTS[muType]['EPSILON'];

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
        const ws = new MuWriteStream(2);

        const smallNum = 1e-8;

        t.equals(n.diff(0, smallNum, ws), false);
        t.equals(n.diff(smallNum, 0, ws), false);
        t.equals(n.diff(0, 1 - smallNum, ws), false);
        t.equals(n.diff(1 - smallNum, 0, ws), false);

        const rs = new MuReadStream(ws.buffer.uint8);

        t.equals(n.patch(123, rs), 123, 'no content to be read, return the base value');
    });

    TYPES.forEach((Type) => {
        const n = new Type();
        const ws = new MuWriteStream(2);

        const muType = n.muType;
        const min = CONSTANTS[muType].MIN;
        const max = CONSTANTS[muType].MAX;

        t.equals(n.diff(1, min, ws), true);
        t.equals(n.diff(1, 0, ws), true);
        t.equals(n.diff(1, max, ws), true);

        const rs = new MuReadStream(ws.buffer.uint8);

        t.equals(n.patch(123, rs), min);
        t.equals(n.patch(123, rs), 0);
        t.equals(n.patch(123, rs), max);
        t.equals(n.patch(123, rs), 123, 'running out of content, return the base value');
    });

    FLOATS.forEach((Type) => {
        const n = new Type();
        const ws = new MuWriteStream(2);

        const muType = n.muType;
        const epsilon = CONSTANTS[muType]['EPSILON'];

        t.equals(n.diff(1.0, -epsilon, ws), true);
        t.equals(n.diff(1.0, epsilon, ws), true);

        const rs = new MuReadStream(ws.buffer.uint8);

        t.equals(n.patch(1.0, rs), -epsilon);
        t.equals(n.patch(1.0, rs), epsilon);
    });

    t.end();
});
