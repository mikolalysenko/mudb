import test = require('tape');
import {
    MuBoolean,
    MuUTF8,
    MuFloat32,
    MuArray,
    MuOption,
    MuSortedArray,
    MuStruct,
    MuUnion,
    MuDictionary,
    MuVector,
    MuDate,
    MuJSON,
    MuBytes,
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
    const array = new MuArray(new MuFloat32(), Infinity);
    const sortedArray = new MuSortedArray(new MuFloat32(), Infinity);
    const union = new MuUnion({ f: new MuFloat32() }, 'f');
    const dictionary = new MuDictionary(new MuFloat32(), Infinity);
    const vector = new MuVector(new MuFloat32(), 5);
    const json = new MuJSON();
    const date = new MuDate();
    t.deepEqual(array.alloc(),          []);
    t.deepEqual(sortedArray.alloc(),    []);
    t.deepEqual(union.alloc(),          {type: 'f', data: 0});
    t.deepEqual(dictionary.alloc(),     {});
    t.deepEqual(vector.alloc(),         new Float32Array(vector.dimension));
    t.deepEqual(json.alloc(),           {});
    t.true(date.alloc() instanceof Date);
    t.end();
});

test('struct.alloc()', (t) => {
    const flat = new MuStruct({ f: new MuFloat32() });
    t.deepEqual(flat.alloc(), {f: 0});

    const nested = new MuStruct({
        s: new MuStruct({
            f: new MuFloat32(),
        }),
    });
    t.deepEqual(nested.alloc(), {s: {f: 0}});
    t.end();
});

// test('alloc, free, alloc', (t) => {
//     const array = new MuArray(new MuFloat32(), Infinity);
//     const sortedArray = new MuSortedArray(new MuFloat32(), Infinity);
//     const struct = new MuStruct({ f: new MuFloat32() });
//     const vector = new MuVector(new MuFloat32(), 5);
//     const date = new MuDate();
//     const optInnerVector = new MuVector(new MuFloat32(), 5);
//     const optNum = new MuOption(optInnerVector);

//     const a = array.alloc();
//     const sa = sortedArray.alloc();
//     const s = struct.alloc();
//     const v = vector.alloc();
//     const d = date.alloc();
//     const o = optNum.alloc();

//     array.free(a);
//     sortedArray.free(sa);
//     struct.free(s);
//     vector.free(v);
//     date.free(d);
//     optNum.free(o);

//     t.is(array.alloc(), a, `should get the pooled array`);
//     t.is(sortedArray.alloc(), sa, `should get the pooled sorted array`);
//     t.is(struct.alloc(), s, `should get the pooled struct`);
//     t.is(vector.alloc(), v, `should get the pooled vector`);
//     t.is(date.alloc(), d, 'should get the pool Date object');
//     t.is(optNum.alloc(), o, 'should get the pool Option vector object');

//     const bytes = new MuBytes();
//     const b = bytes.alloc();
//     bytes.free(b);
//     t.is(bytes.alloc(), b, 'should get the pooled Uint8Array');
//     t.end();
// });
