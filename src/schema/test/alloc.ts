import * as test from 'tape';
import {
    MuASCII,
    MuFixedASCII,
    MuUTF8,
    MuBoolean,
    MuFloat32,
    MuFloat64,
    MuInt8,
    MuInt16,
    MuInt32,
    MuUint8,
    MuUint16,
    MuUint32,
    MuVarint,
    MuRelativeVarint,
    MuStruct,
    MuArray,
    MuSortedArray,
    MuDictionary,
    MuVector,
    MuUnion,
    MuDate,
    MuJSON,
    MuBytes,
    MuOption,
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
    const struct = new MuStruct({
        struct: new MuStruct({
            ascii: new MuASCII(),
            fixed: new MuFixedASCII(1),
            utf8: new MuUTF8(),
            bool: new MuBoolean(),
            float32: new MuFloat32(),
            float64: new MuFloat64(),
            int8: new MuInt8(),
            int16: new MuInt16(),
            int32: new MuInt32(),
            uint8: new MuUint8(),
            uint16: new MuUint16(),
            uint32: new MuUint32(),
            varint: new MuVarint(),
            rvarint: new MuRelativeVarint(),
            array: new MuArray(new MuFloat32(), Infinity),
            sorted: new MuSortedArray(new MuFloat32(), Infinity),
            dict: new MuDictionary(new MuFloat32(), Infinity),
            vector: new MuVector(new MuFloat32(), 3),
            union: new MuUnion({
                b: new MuBoolean(),
                f: new MuFloat32(),
            }),
        }),
    });

    t.deepEqual(struct.alloc(), {
        struct: {
            ascii: '',
            fixed: ' ',
            utf8: '',
            bool: false,
            float32: 0,
            float64: 0,
            int8: 0,
            int16: 0,
            int32: 0,
            uint8: 0,
            uint16: 0,
            uint32: 0,
            varint: 0,
            rvarint: 0,
            array: [],
            sorted: [],
            dict: {},
            vector: new Float32Array(3),
            union: {
                type: '',
                data: undefined,
            },
        },
    });
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
