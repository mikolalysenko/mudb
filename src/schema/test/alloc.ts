import test = require('tape');
import {
    MuBoolean,
    MuUTF8,
    MuFloat32,
    MuArray,
    MuSortedArray,
    MuVector,
    MuStruct,
    MuDictionary,
    MuUnion,
} from '../index';

test('primitive.alloc()', (t) => {
    t.comment('equals primitive.identity');
    const bool = new MuBoolean(true);
    t.equal(bool.alloc(), true);
    const utf8 = new MuUTF8('Iñtërnâtiônàlizætiøn☃💩');
    t.equal(utf8.alloc(), 'Iñtërnâtiônàlizætiøn☃💩');
    const float32 = new MuFloat32(0.5);
    t.equal(float32.alloc(), 0.5);
    t.end();
});

test('nonPrimitive.alloc()', (t) => {
    const array = new MuArray(new MuFloat32());
    const sortedArray = new MuSortedArray(new MuFloat32());
    const vector = new MuVector(new MuFloat32(), 5);
    const dictionary = new MuDictionary(new MuFloat32());
    const union = new MuUnion({ f: new MuFloat32() });

    t.deepEqual(array.alloc(), []);
    t.deepEqual(sortedArray.alloc(), []);
    t.deepEqual(vector.alloc(), new Float32Array(vector.dimension));
    t.deepEqual(dictionary.alloc(), {});
    t.deepEqual(union.alloc(), {type: '', data: undefined});
    t.end();
});

test('struct.alloc()', (t) => {
    const struct = new MuStruct({ f: new MuFloat32() });
    t.deepEqual(struct.alloc(), {f: 0});

    const nestedStruct = new MuStruct({
        s: new MuStruct({
            f: new MuFloat32(),
        }),
    });
    t.deepEqual(nestedStruct.alloc(), {s: {f: 0}});
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

    t.equal(array.alloc(), a, `should get the pooled array`);
    t.equal(sortedArray.alloc(), sa, `should get the pooled sorted array`);
    t.equal(vector.alloc(), v, `should get the pooled vector`);
    t.equal(struct.alloc(), s, `should get the pooled struct`);
    t.end();
});
