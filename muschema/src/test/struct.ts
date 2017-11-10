import test = require('tape');

import {
    MuStruct,
    MuFloat64,
    MuBoolean,
    MuString,
    MuInt8,
} from '../index';

test('struct', function (t) {
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
