import test = require('tape');

import { MuFixedASCIIString } from '../';
import { testPatchingPairFactory, simpleStrOfLeng } from './_helper';

test('fixed-length ascii - diff() & patch()', (t) => {
    function ASCIIOfLeng (length) {
        const codePoints = new Array(length);
        for (let i = 0; i < length; ++i) {
            codePoints[i] = Math.random() * 0x80 | 0;
        }
        return String.fromCharCode.apply(String, codePoints);
    }

    let schema = new MuFixedASCIIString(0);
    let testPair = testPatchingPairFactory(t, schema);
    testPair('', '');

    schema = new MuFixedASCIIString(1);
    testPair = testPatchingPairFactory(t, schema);
    for (let i = 0; i < 100; ++i) {
        testPair(
            ASCIIOfLeng(1),
            ASCIIOfLeng(1),
        );

        testPair(
            simpleStrOfLeng(1),
            simpleStrOfLeng(1),
        );
    }

    schema = new MuFixedASCIIString(0x10000);
    testPair = testPatchingPairFactory(t, schema);
    for (let i = 0; i < 10; ++i) {
        testPair(
            ASCIIOfLeng(0x10000),
            ASCIIOfLeng(0x10000),
        );
    }

    t.end();
});
