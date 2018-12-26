import test = require('tape');
import { MuWriteStream } from '../../stream';
import {
    MuFloat32,
    MuArray,
    MuSortedArray,
    MuDictionary,
} from '../index';

test('array.capacity', (t) => {
    let array = new MuArray(new MuFloat32());
    t.equal(array.capacity, Infinity, 'capacity defaults to Infinity');

    // @ts-ignore
    array = new MuArray(new MuFloat32(), null, 1000);
    t.equal(array.capacity, 1000);
    array = new MuArray(new MuFloat32(), [], 100);
    t.equal(array.capacity, 100);

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
    let sortedArray = new MuSortedArray(new MuFloat32());
    t.equal(sortedArray.capacity, Infinity, 'capacity defaults to Infinity');

    // @ts-ignore
    sortedArray = new MuSortedArray(new MuFloat32(), (a, b) => a - b, null, 1000);
    t.equal(sortedArray.capacity, 1000);
    sortedArray = new MuSortedArray(new MuFloat32(), (a, b) => a - b, 100);
    t.equal(sortedArray.capacity, 100);

    sortedArray = new MuSortedArray(new MuFloat32(), (a, b) => a - b, 3);
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
    let dictionary = new MuDictionary(new MuFloat32());
    t.equal(dictionary.capacity, Infinity, 'capacity defaults to Infinity');

    // @ts-ignore
    dictionary = new MuDictionary(new MuFloat32(), null, 1000);
    t.equal(dictionary.capacity, 1000);
    dictionary = new MuDictionary(new MuFloat32(), {}, 100);
    t.equal(dictionary.capacity, 100);

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
