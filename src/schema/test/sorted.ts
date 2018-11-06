import test = require('tape');

import {
    MuSortedArray,
    MuFloat64,
} from '../';
import { MuWriteStream, MuReadStream } from '../../stream';

function cmp (a, b) { return a - b; }

test('simple sorted set', function (t) {
    const schema = new MuSortedArray(new MuFloat64());

    function testPatch (a:number[], b:number[]) {
        const s = new MuWriteStream(1);
        if (!schema.diff(a, b, s)) {
            t.same(a, b, 'diff returned arrays identical');
            t.equals(s.offset, 0, 'no bytes written to stream');
        } else {
            t.notSame(a, b, 'diff returned arrays different');
            t.notEquals(s.offset, 0, 'at least one byte written to stream');
            const o = new MuReadStream(s.bytes());
            t.same(schema.patch(a, o), b, 'patch(diff) ok');
            t.equals(o.offset, o.length, 'all bytes used in patch');
        }
    }

    function testPair (a:number[], b:number[]) {
        a.sort(cmp);
        b.sort(cmp);
        testPatch(a, b);
        testPatch(b, a);
        testPatch(a, a);
        testPatch(b, b);
        testPatch([], a);
        testPatch([], b);
    }

    testPatch([], []);
    testPatch([0], [0]);
    testPair([1], [0]);
    testPair([0, 1, 1], [0, 0, 0, 0]);
    testPair([1, 2, 3], [1, 2, 3]);
    testPair([1, 1, 5], [3, 5, 11, 12]);
    testPatch([0, 0, 1, 2, 3, 3, 3, 4], [1, 1, 2]);

    function randomArray () {
        const n = Math.floor(Math.random() * 10);
        const x = new Array(n);
        for (let i = 0; i < n; ++i) {
            x[i] = (Math.random() * 5) | 0;
        }
        return x;
    }

    for (let i = 0; i < 1000; ++i) {
        testPair(randomArray(), randomArray());
    }

    t.end();
});
