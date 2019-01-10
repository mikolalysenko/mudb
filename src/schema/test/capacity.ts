import test = require('tape');
import { MuWriteStream } from '../../stream';
import {
    MuFloat32,
    MuArray,
    MuSortedArray,
    MuDictionary,
} from '../index';

test('array.capacity', (t) => {
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
    t.throws(() => array.diff([], [0, 1, 2, 3], out), RangeError, 'should throw when target size exceeds capacity');
    t.throws(() => array.diff([], [0, 1, 2, 3, 4], out), RangeError);
    t.end();
});

test('sortedArray.capacity', (t) => {
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

test('dictionary.capacity', (t) => {
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
