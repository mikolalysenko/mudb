import tape = require('tape');

import HelStruct = require('../struct');

import HelInt8 = require('../int8');
import HelInt16 = require('../int16');
import HelInt32 = require('../int32');

import HelUint8 = require('../uint8');
import HelUint16 = require('../uint16');
import HelUint32 = require('../uint32');

import HelFloat32 = require('../float32');
import HelFloat64 = require('../float64');

import HelBoolean = require('../boolean');

import HelString = require('../string');

tape('struct', function (t) {
    const simpleStruct = HelStruct({
        x: HelFloat64(1),
        y: HelBoolean(),
        str: HelString('foo'),
    });

    t.equals(simpleStruct.identity.x, 1);
    t.equals(simpleStruct.identity.y, false);
    t.equals(simpleStruct.identity.str, 'foo');

    const structA = simpleStruct.alloc();
    const structB = simpleStruct.alloc();

    structA.x = 1000;
    console.log('a=', structA, 'b=', structB, 'patch =', simpleStruct.diff(structB, structA));


    const recursiveStruct = HelStruct({
        a: simpleStruct,
        b: simpleStruct,
        q: HelInt8(11),
    });

    t.end();
});