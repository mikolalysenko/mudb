import test = require('tape');
import { MuWriteStream, MuReadStream } from '../../stream';
import {
    MuFloat32,
    MuArray,
    MuSortedArray,
    MuDictionary,
} from '../index';

test('guarding array.diff()', (t) => {
    let array = new MuArray(new MuFloat32(), Infinity);
    t.equal(array.capacity, Infinity);
    array = new MuArray(new MuFloat32(), 0);
    t.equal(array.capacity, 0);
    array = new MuArray(new MuFloat32(), 3);
    t.equal(array.capacity, 3);

    const out = new MuWriteStream(1);
    t.doesNotThrow(() => array.diff([], [0], out));
    t.doesNotThrow(() => array.diff([], [0, 1], out));
    t.doesNotThrow(() => array.diff([0, 1, 2], [1, 2, 3], out));
    t.doesNotThrow(() => array.diff([0, 1, 2, 3], [1, 2, 3], out));
    t.throws(() => array.diff([], [0, 1, 2, 3], out), RangeError);
    t.throws(() => array.diff([], [0, 1, 2, 3, 4], out), RangeError);
    t.end();
});

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

test('guarding sortedArray.diff()', (t) => {
    let sortedArray = new MuSortedArray(new MuFloat32(), Infinity, (a, b) => a - b);
    t.equal(sortedArray.capacity, Infinity);
    sortedArray = new MuSortedArray(new MuFloat32(), 0, (a, b) => a - b);
    t.equal(sortedArray.capacity, 0);
    sortedArray = new MuSortedArray(new MuFloat32(), 3, (a, b) => a - b);
    t.equal(sortedArray.capacity, 3);

    const out = new MuWriteStream(1);
    t.doesNotThrow(() => sortedArray.diff([], [0], out));
    t.doesNotThrow(() => sortedArray.diff([], [0, 1], out));
    t.doesNotThrow(() => sortedArray.diff([0, 1, 2], [1, 2, 3], out));
    t.doesNotThrow(() => sortedArray.diff([0, 1, 2, 3], [1, 2, 3], out));
    t.throws(() => sortedArray.diff([], [0, 1, 2, 3], out), RangeError, 'should throw when target size exceeds capacity');
    t.throws(() => sortedArray.diff([], [0, 1, 2, 3, 4], out), RangeError);
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

test('guarding dictionary.diff()', (t) => {
    let dictionary = new MuDictionary(new MuFloat32(), Infinity);
    t.equal(dictionary.capacity, Infinity);
    dictionary = new MuDictionary(new MuFloat32(), 0);
    t.equal(dictionary.capacity, 0);
    dictionary = new MuDictionary(new MuFloat32(), 3);
    t.equal(dictionary.capacity, 3);

    const out = new MuWriteStream(1);
    t.doesNotThrow(() => dictionary.diff({}, {a: 0}, out));
    t.doesNotThrow(() => dictionary.diff({}, {a: 0, b: 0}, out));
    t.doesNotThrow(() => dictionary.diff({}, {a: 0, b: 0, c: 0}, out));
    t.doesNotThrow(() => dictionary.diff({a: 0, b: 0, c: 0}, {a: 0, b: 1, c: 2}, out));
    t.doesNotThrow(() => dictionary.diff({a: 0, b: 0, c: 0, d: 0}, {a: 0, b: 1, c: 2}, out));
    t.throws(() => dictionary.diff({}, {a: 0, b: 0, c: 0, d: 0}, out), RangeError, 'should throw when target size exceeds capacity');
    t.throws(() => dictionary.diff({}, {a: 0, b: 0, c: 0, d: 0, e: 0}, out), RangeError);
    t.end();
});

test('guarding dictionary.patch()', (t) => {
    const infiniteDictionary = new MuDictionary(new MuFloat32(), Infinity);
    const out = new MuWriteStream(1);
    infiniteDictionary.diff({a: 0, b: 0, c: 0, d: 0}, {}, out);

    const finiteDictionary = new MuDictionary(new MuFloat32(), Infinity);
    const inp = new MuReadStream(out.buffer.uint8);
    t.throws(() => finiteDictionary.patch({a: 0, b: 0, c: 0}, inp), Error);
    t.end();
});
