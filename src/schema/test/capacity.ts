import * as test from 'tape';
import { MuWriteStream, MuReadStream } from '../../stream';
import {
    MuFloat32,
    MuArray,
    MuSortedArray,
    MuDictionary,
} from '../index';

test('guarding array.patch()', (t) => {
    const infiniteArray = new MuArray(new MuFloat32(), Infinity);
    const out = new MuWriteStream(1);
    infiniteArray.diff([], [1], out);
    infiniteArray.diff([], [1, 2, 3], out);
    infiniteArray.diff([], [1, 2, 3, 4], out);

    const finiteArray = new MuArray(new MuFloat32(), 3);
    const inp = new MuReadStream(out.buffer.uint8);
    t.doesNotThrow(() => finiteArray.patch([], inp));
    t.doesNotThrow(() => finiteArray.patch([], inp));
    t.throws(() => finiteArray.patch([], inp), RangeError);
    t.end();
});

test('guarding sortedArray.patch()', (t) => {
    const infiniteSortedArray = new MuSortedArray(new MuFloat32(), Infinity);
    const out = new MuWriteStream(1);
    infiniteSortedArray.diff([], [1], out);
    infiniteSortedArray.diff([], [1, 2, 3], out);
    infiniteSortedArray.diff([], [1, 2, 3, 4], out);

    const finiteSortedArray = new MuSortedArray(new MuFloat32(), 3);
    const inp = new MuReadStream(out.buffer.uint8);
    t.doesNotThrow(() => finiteSortedArray.patch([], inp));
    t.doesNotThrow(() => finiteSortedArray.patch([], inp));
    t.throws(() => finiteSortedArray.patch([], inp), RangeError);
    t.end();
});

test('guarding dictionary.patch()', (t) => {
    const infiniteDictionary = new MuDictionary(new MuFloat32(), Infinity);
    const out = new MuWriteStream(1);
    infiniteDictionary.diff({}, {a: 0, b: 0, c: 0, d: 0}, out);

    const finiteDictionary = new MuDictionary(new MuFloat32(), 3);
    const inp = new MuReadStream(out.buffer.uint8);
    t.throws(() => finiteDictionary.patch({}, inp), Error);
    t.end();
});
