import test = require('tape');

import { MuASCIIString } from '../';
import { randomShortStr, testPatchingPairFactory } from './_helper';

test('ascii - diff() & patch()', (t) => {
    function randomASCII () {
        const length = Math.random() * 21 | 0;
        const codePoints = new Array(length);
        for (let i = 0; i < length; ++i) {
            codePoints[i] = Math.random() * 0x80 | 0;
        }
        return String.fromCharCode.apply(null, codePoints);
    }

    const schema = new MuASCIIString();
    const testPatchingPair = testPatchingPairFactory(t, schema);

    for (let i = 0; i < 200; ++i) {
        testPatchingPair(
            randomASCII(),
            randomASCII(),
        );
    }

    for (let i = 0; i < 200; ++i) {
        testPatchingPair(
            randomShortStr(),
            randomShortStr(),
        );
    }

    t.end();
});
