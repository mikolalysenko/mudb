import test = require('tape');

import { MuUTF8 } from '../utf8';
import { MuReadStream, MuWriteStream } from '../../stream';

test('utf8', (t) => {
    const defaultValue = '';
    let s = new MuUTF8();

    t.equals(s.muType, 'utf8', `type should be utf8`);
    t.equals(s.identity, defaultValue);
    t.equals(s.alloc(), defaultValue);
    t.equals(s.clone(''), '');

    const ascii = 'I <3 you.';
    const twoBytes = 'אני אוהבת אותך';
    const threeBytes = '我♥你';
    const fourBytes = '👩👨❤️👨👩';
    const varBytes = fourBytes + twoBytes + ascii + threeBytes;

    s = new MuUTF8(varBytes);

    t.equals(s.identity, varBytes);
    t.equals(s.alloc(), varBytes);
    t.equals(s.clone(varBytes), varBytes);

    let longStr = '';
    for (let i = 0; i < 100000; ++i) {
        longStr += varBytes;
    }

    s = new MuUTF8(longStr);

    t.equals(s.identity, longStr);
    t.equals(s.alloc(), longStr);
    t.equals(s.clone(longStr), longStr);

    const ws = new MuWriteStream(2);

    t.equals(s.diff(longStr, longStr, ws), false);
    t.equals(s.diff(longStr, longStr.substring(0, longStr.length - 1), ws), true);

    const rs = new MuReadStream(ws.bytes());

    t.equals(s.patch(longStr, rs), longStr.substring(0, longStr.length - 1));

    t.end();
});
