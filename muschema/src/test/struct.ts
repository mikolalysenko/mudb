import test = require('tape');

import {
    MuStruct,
    MuFloat64,
    MuBoolean,
    MuString,
    MuInt8,
} from '../index';
import {
    MuWriteStream,
    MuReadStream,
} from 'mustreams';

test('simple struct identity', function (t) {
    const simpleStruct = new MuStruct({
        x: new MuFloat64(1),
        y: new MuBoolean(),
        str: new MuString('foo'),
    });

    t.equals(simpleStruct.identity.x, 1);
    t.equals(simpleStruct.identity.y, false);
    t.equals(simpleStruct.identity.str, 'foo');

    const structA = simpleStruct.alloc();
    const structB = simpleStruct.alloc();

    structA.x = 1000;
    console.log('a=', structA, 'b=', structB, 'patch =', simpleStruct.diff(structB, structA));

    const recursiveStruct = new MuStruct({
        a: simpleStruct,
        b: simpleStruct,
        q: new MuInt8(11),
    });

    t.end();
});

test('simple struct diffBinary()', (t) => {
    const simpleStruct = new MuStruct({
        x: new MuFloat64(1),
        y: new MuBoolean(),
        str: new MuString('foo'),
    });

    const ws = new MuWriteStream(2);

    t.equals(
        simpleStruct.diffBinary(
            { x: 1, y: false, str: 'foo' },
            { x: 1, y: false, str: 'foo' },
            ws,
        ),
        false,
    );

    t.equals(
        simpleStruct.diffBinary(
            { x: 1, y: false, str: 'foo' },
            { x: 1, y: false, str: 'bar' },
            ws,
        ),
        true,
    );

    t.end();
});

test('simple struct patchBinary()', (t) => {
    const simpleStruct = new MuStruct({
        x: new MuFloat64(1),
        y: new MuBoolean(),
        str: new MuString('foo'),
    });

    let ws = new MuWriteStream(2);
    simpleStruct.diffBinary(
        { x: 1, y: false, str: 'foo' },
        { x: 1, y: false, str: 'foo' },
        ws,
    );
    let rs = new MuReadStream(ws);
    t.deepEquals(
        simpleStruct.patchBinary(
            { x: 1, y: false, str: 'foo' },
            rs,
        ),
        { x: 1, y: false, str: 'foo' },
    );

    ws = new MuWriteStream(2);
    simpleStruct.diffBinary(
        { x: 1, y: false, str: 'foo' },
        { x: 1, y: false, str: 'bar' },
        ws,
    );
    rs = new MuReadStream(ws);
    t.deepEquals(
        simpleStruct.patchBinary({ x: 1, y: false, str: 'foo' }, rs),
        { x: 1, y: false, str: 'bar' },
    );

    t.end();
});

test('struct getByteLength()', (t) => {
    const simpleStruct = new MuStruct({
        x: new MuFloat64(1),
        y: new MuBoolean(),
        str: new MuString('foo'),
    });

    t.equals(simpleStruct.getByteLength({ x: 1, y: false, str: 'foo' }), 8 + 1 + 4 + 3 * 1);

    t.end();
});
