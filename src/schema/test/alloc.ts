import test = require('tape');
import {
    MuFloat32,
    MuArray,
    MuSortedArray,
    MuVector,
    MuStruct,
    MuDictionary,
    MuUnion,
} from '../index';

test('schema.alloc()', (t) => {
    const array = new MuArray(new MuFloat32());
    const sortedArray = new MuSortedArray(new MuFloat32());
    const vector = new MuVector(new MuFloat32(), 5);
    const struct = new MuStruct({ f: new MuFloat32() });
    const dictionary = new MuDictionary(new MuFloat32());
    const union = new MuUnion({ f: new MuFloat32() });

    t.deepEqual(array.alloc(), []);
    t.deepEqual(sortedArray.alloc(), []);
    t.deepEqual(vector.alloc(), new Float32Array(vector.dimension));
    t.deepEqual(struct.alloc(), { f: 0 });
    t.deepEqual(dictionary.alloc(), {});
    t.deepEqual(union.alloc(), { type: '', data: undefined });
    t.end();
});

test('alloc, free, alloc', (t) => {
    const array = new MuArray(new MuFloat32());
    const sortedArray = new MuSortedArray(new MuFloat32());
    const vector = new MuVector(new MuFloat32(), 5);
    const struct = new MuStruct({ f: new MuFloat32() });

    const a = array.alloc();
    const sa = sortedArray.alloc();
    const v = vector.alloc();
    const s = struct.alloc();

    array.free(a);
    sortedArray.free(sa);
    vector.free(v);
    struct.free(s);

    t.ok(array.alloc() === a, `should get the pooled array`);
    t.ok(sortedArray.alloc() === sa, `should get the pooled sorted array`);
    t.ok(vector.alloc() === v, `should get the pooled vector`);
    t.ok(struct.alloc() === s, `should get the pooled struct`);
    t.end();
});
