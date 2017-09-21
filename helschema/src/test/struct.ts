import tape = require('tape');

import HelStruct from '../struct';

import HelInt8 from '../int8';
import HelInt16 from '../int16';
import HelInt32 from '../int32';

import HelUint8 from '../uint8';
import HelUint16 from '../uint16';
import HelUint32 from '../uint32';

import HelFloat32 from '../float32';
import HelFloat64 from '../float64';

import HelBoolean from '../boolean';

import HelString from '../string';

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