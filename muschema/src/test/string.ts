import test = require('tape');

import { MuString } from '../string';
import { MuReadStream, MuWriteStream } from 'mustreams';

test('string', (t) => {
    const defaultValue = '';
    let s = new MuString();

    t.equals(s.identity, defaultValue);
    t.equals(s.alloc(), defaultValue);
    t.equals(s.clone(''), '');

    const ascii = 'I <3 you.';
    const twoBytes = 'אני אוהבת אותך';
    const threeBytes = '我♥你';
    const fourBytes = '👩👨❤️👨👩';
    const varBytes = fourBytes + twoBytes + ascii + threeBytes;

    s = new MuString(varBytes);

    t.equals(s.identity, varBytes);
    t.equals(s.alloc(), varBytes);
    t.equals(s.clone(varBytes), varBytes);

    let longStr = '';
    for (let i = 0; i < 100000; ++i) {
        longStr += varBytes;
    }

    s = new MuString(longStr);

    t.equals(s.identity, longStr);
    t.equals(s.alloc(), longStr);
    t.equals(s.clone(longStr), longStr);

    const ws = new MuWriteStream(2);

    t.equals(s.diff(longStr, longStr, ws), false);
    t.equals(s.diff(longStr, longStr.substring(0, longStr.length - 1), ws), true);

    const rs = new MuReadStream(ws.buffer.buffer);

    t.equals(s.patchBinary(longStr, rs), longStr.substring(0, longStr.length - 1));
    t.equals(s.patchBinary(longStr, rs), longStr, 'running out of content, return the base value');

    t.end();
});
