import test = require('tape');
import { Constants } from '../constants';

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

const numSchemaTypes = [
    MuInt8, MuInt16, MuInt32,
    MuUint8, MuUint16, MuUint32,
    MuFloat32, MuFloat64,
];

const intSchemaTypes = [
    MuInt8, MuInt16, MuInt32,
    MuUint8, MuUint16, MuUint32,
];

const floatSchemaTypes = [
    MuFloat32,
    MuFloat64,
];

test('alloc() & clone()', (t) => {
    numSchemaTypes.forEach((Type) => {
        const defaultValue = 0;
        let numSchema = new Type();

        t.equals(numSchema.identity, defaultValue);
        t.equals(numSchema.alloc(), defaultValue);
        t.equals(numSchema.clone(0), 0);

        const muType = numSchema.muType;
        const min = Constants[muType].MIN;
        const max = Constants[muType].MAX;

        numSchema = new Type(min);

        t.equals(numSchema.identity, min);
        t.equals(numSchema.alloc(), min);
        t.equals(numSchema.clone(min), min);

        numSchema = new Type(max);

        t.equals(numSchema.identity, max);
        t.equals(numSchema.alloc(), max);
        t.equals(numSchema.clone(max), max);

        if (muType.indexOf('int') === 0) {
            numSchema = new Type(-1);

            t.equals(numSchema.identity, -1);
            t.equals(numSchema.alloc(), -1);
            t.equals(numSchema.clone(-1), -1);
        }

        if (Constants[muType]['EPSILON']) {
            const epsilon = Constants[muType]['EPSILON'];

            numSchema = new Type(-epsilon);

            t.equals(numSchema.identity, -epsilon);
            t.equals(numSchema.alloc(), -epsilon);
            t.equals(numSchema.clone(-epsilon), -epsilon);

            numSchema = new Type(epsilon);

            t.equals(numSchema.identity, epsilon);
            t.equals(numSchema.alloc(), epsilon);
            t.equals(numSchema.clone(epsilon), epsilon);
        }
    });

    t.end();
});

test('diff() & patch()', (t) => {
    intSchemaTypes.forEach((Type) => {
        const intSchema = new Type();
        const ws = new MuWriteStream(2);

        const smallNum = 1e-8;

        t.false(intSchema.diff(0, smallNum, ws));
        t.false(intSchema.diff(smallNum, 0, ws));
        t.false(intSchema.diff(0, 1 - smallNum, ws));
        t.false(intSchema.diff(1 - smallNum, 0, ws));
    });

    numSchemaTypes.forEach((Type) => {
        const numSchema = new Type();
        const ws = new MuWriteStream(2);

        const muType = numSchema.muType;
        const min = Constants[muType].MIN;
        const max = Constants[muType].MAX;

        t.true(numSchema.diff(1, min, ws));
        t.true(numSchema.diff(1, 0, ws));
        t.true(numSchema.diff(1, max, ws));

        const rs = new MuReadStream(ws.buffer.uint8);

        t.equals(numSchema.patch(123, rs), min);
        t.equals(numSchema.patch(123, rs), 0);
        t.equals(numSchema.patch(123, rs), max);
    });

    floatSchemaTypes.forEach((Type) => {
        const floatSchema = new Type();
        const ws = new MuWriteStream(2);

        const muType = floatSchema.muType;
        const epsilon = Constants[muType]['EPSILON'];

        t.true(floatSchema.diff(1.0, -epsilon, ws));
        t.true(floatSchema.diff(1.0, epsilon, ws));

        const rs = new MuReadStream(ws.buffer.uint8);

        t.equals(floatSchema.patch(1.0, rs), -epsilon);
        t.equals(floatSchema.patch(1.0, rs), epsilon);
    });

    t.end();
});
