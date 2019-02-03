import test = require('tape');
import {
    MuBoolean,
    MuUTF8,
    MuFloat32,
    MuDate,
    MuArray,
    MuSortedArray,
    MuVector,
    MuDictionary,
    MuStruct,
    MuUnion,
    MuJSON,
} from '../index';

test('primitive.equal()', (t) => {
    const bool = new MuBoolean();
    t.true(bool.equal(true, true));
    t.true(bool.equal(false, false));
    t.false(bool.equal(true, false));
    t.false(bool.equal(false, true));

    const utf8 = new MuUTF8();
    t.true(utf8.equal('', ''));
    t.true(utf8.equal(
        `<a href="https://github.com/mikolalysenko/mudb/">mudb</a>`,
        `<a href="https://github.com/mikolalysenko/mudb/">mudb</a>`,
    ));
    t.true(utf8.equal('Iñtërnâtiônàlizætiøn☃💩', 'Iñtërnâtiônàlizætiøn☃💩'));
    t.false(utf8.equal('a', 'b'));

    const float32 = new MuFloat32();
    t.true(float32.equal(0.5, 0.5));
    t.false(float32.equal(0, 1));

    t.end();
});

test('date.equal()', (t) => {
    const date = new MuDate();
    const d1 = date.alloc();
    const d2 = date.alloc();
    d2.setTime(0);
    t.false(date.equal(d1, d2));
    d2.setTime(d1.getTime());
    t.true(date.equal(d1, d2));
    t.end();
});

test('array.equal()', (t) => {
    const array = new MuArray(new MuFloat32(), Infinity);
    t.true(array.equal([], []));
    t.true(array.equal([0.5], [0.5]));
    t.true(array.equal([0, 0.5, 1], [0, 0.5, 1]));
    t.false(array.equal([], [0]));
    t.false(array.equal([0, 1], [0]));
    t.false(array.equal([0], [1]));
    t.false(array.equal([0, 0.5, 1], [0, 1, 0.5]));

    const nestedArray = new MuArray(
        new MuArray(new MuFloat32(), Infinity),
        Infinity,
    );
    t.true(nestedArray.equal([], []));
    t.true(nestedArray.equal([[]], [[]]));
    t.true(nestedArray.equal([[0.5]], [[0.5]]));
    t.true(nestedArray.equal([[0.5, 0, 1]], [[0.5, 0, 1]]));
    t.true(nestedArray.equal(
        [[0.5, 0, 1], [0, 0.5, 1]],
        [[0.5, 0, 1], [0, 0.5, 1]],
    ));
    t.false(nestedArray.equal([[]], []));
    t.false(nestedArray.equal([[0]], [[]]));
    t.false(nestedArray.equal([[0, 1]], [[0]]));
    t.false(nestedArray.equal([[1]], [[0]]));
    t.false(nestedArray.equal([[0, 1, 0.5]], [[0, 0.5, 1]]));
    t.false(nestedArray.equal(
        [[0.5, 0, 1], [0, 0.5, 1]],
        [[0.5, 0, 1]],
    ));
    t.false(nestedArray.equal(
        [[0.5, 0, 1], [0, 0.5, 1]],
        [[0, 0.5, 1], [0.5, 0, 1]],
    ));
    t.end();
});

test('sortedArray.equal()', (t) => {
    const array = new MuSortedArray(new MuFloat32(), Infinity);
    t.true(array.equal([], []));
    t.true(array.equal([0.5], [0.5]));
    t.true(array.equal([0, 0.5, 1], [0, 0.5, 1]));
    t.false(array.equal([], [0]));
    t.false(array.equal([0, 1], [0]));
    t.false(array.equal([0], [1]));
    t.false(array.equal([0, 0.5, 1], [0, 0.5, 1.5]));

    const nestedArray = new MuSortedArray(
        new MuSortedArray(new MuFloat32(), Infinity),
        Infinity,
    );
    t.true(nestedArray.equal([], []));
    t.true(nestedArray.equal([[]], [[]]));
    t.true(nestedArray.equal([[0.5]], [[0.5]]));
    t.true(nestedArray.equal([[0, 0.5, 1]], [[0, 0.5, 1]]));
    t.true(nestedArray.equal(
        [[0, 0.5, 1], [0, 0.5, 1]],
        [[0, 0.5, 1], [0, 0.5, 1]],
    ));
    t.false(nestedArray.equal([[]], []));
    t.false(nestedArray.equal([[0]], [[]]));
    t.false(nestedArray.equal([[0, 1]], [[0]]));
    t.false(nestedArray.equal([[1]], [[0]]));
    t.false(nestedArray.equal([[0, 0.5, 1]], [[0, 0.5, 1.5]]));
    t.false(nestedArray.equal(
        [[0, 0.5, 1], [0, 0.5, 1]],
        [[0, 0.5, 1]],
    ));
    t.false(nestedArray.equal(
        [[0, 0.5, 1], [0, 0.5, 1]],
        [[0, 0.5, 1], [0, 0.5, 1.5]],
    ));
    t.end();
});

test('vector.equal()', (t) => {
    const mat3 = new MuVector(new MuFloat32(), 9);
    const m1 = mat3.alloc();
    const m2 = mat3.alloc();
    t.true(mat3.equal(m1, m2));
    m2[8] += 0.5;
    t.false(mat3.equal(m1, m2));
    t.end();
});

test('dictionary.equal()', (t) => {
    const dictionary = new MuDictionary(new MuFloat32(), Infinity);
    t.true(dictionary.equal({}, {}));
    t.true(dictionary.equal({a: 0}, {a: 0}));
    t.true(dictionary.equal({a: 0, b: 1}, {a: 0, b: 1}));
    t.false(dictionary.equal({}, {a: 0}));
    t.false(dictionary.equal({a: 0, b: 0}, {a: 0}));
    t.false(dictionary.equal({a: 0}, {b: 0}));
    t.false(dictionary.equal({a: 0}, {a: 1}));

    const nestedDictionary = new MuDictionary(
        new MuDictionary(new MuFloat32(), Infinity),
        Infinity,
    );
    t.true(nestedDictionary.equal({}, {}));
    t.true(nestedDictionary.equal({a: {}}, {a: {}}));
    t.true(nestedDictionary.equal({a: {}, b: {}}, {a: {}, b: {}}));
    t.true(nestedDictionary.equal({a: {b: 0}}, {a: {b: 0}}));
    t.true(nestedDictionary.equal({a: {b: 0, c: 1}}, {a: {b: 0, c: 1}}));
    t.true(nestedDictionary.equal(
        {a: {c: 0}, b: {d: 1}},
        {a: {c: 0}, b: {d: 1}},
    ));
    t.true(nestedDictionary.equal(
        {a: {c: 0, d: 1}, b: {c: 0, d: 1}},
        {a: {c: 0, d: 1}, b: {c: 0, d: 1}},
    ));
    t.false(nestedDictionary.equal({}, {a: {}}));
    t.false(nestedDictionary.equal({a: {}, b: {}}, {a: {}}));
    t.false(nestedDictionary.equal({a: {}}, {b: {}}));
    t.false(nestedDictionary.equal({a: {b: 0}}, {a: {b: 1}}));
    t.end();
});

test('struct.equal()', (t) => {
    const struct = new MuStruct({
        a: new MuFloat32(),
        b: new MuFloat32(),
    });
    t.true(struct.equal({a: 0, b: 0}, {a: 0, b: 0}));
    t.true(struct.equal({a: 0.5, b: 1}, {a: 0.5, b: 1}));
    t.false(struct.equal({a: 0.5, b: 0.5}, {a: 0.5, b: 1}));
    t.false(struct.equal({a: 0, b: 1}, {a:  1, b: 0}));

    const nestedStruct = new MuStruct({
        a: new MuStruct({
            c: new MuUTF8(),
            d: new MuBoolean(),
            e: new MuFloat32(),
        }),
        b: new MuStruct({
            f: new MuUTF8(),
            g: new MuBoolean(),
            h: new MuFloat32(),
        }),
    });
    t.true(nestedStruct.equal(
        {a: {c: '', d: false, e: 0}, b: {f: 'ab', g: true, h: 0.5}},
        {a: {c: '', d: false, e: 0}, b: {f: 'ab', g: true, h: 0.5}},
    ));
    t.false(nestedStruct.equal(
        {a: {c: '', d: false, e: 0}, b: {f: 'ab', g: true, h: 0.5}},
        {a: {c: '', d: false, e: 0}, b: {f: 'abc', g: true, h: 0.5}},
    ));
    t.end();
});

test('union.equal()', (t) => {
    const stringOrFloat = new MuUnion({
        u: new MuUTF8(),
        f: new MuFloat32(),
    });
    t.true(stringOrFloat.equal({type: 'u', data: 'ab'}, {type: 'u', data: 'ab'}));
    t.true(stringOrFloat.equal({type: 'f', data: 0.5}, {type: 'f', data: 0.5}));
    t.false(stringOrFloat.equal({type: 'u', data: 'ab'}, {type: 'u', data: 'abc'}));
    t.false(stringOrFloat.equal({type: 'f', data: 0.5}, {type: 'f', data: 1}));
    t.false(stringOrFloat.equal({type: 'u', data: 'ab'}, {type: 'f', data: 0.5}));

    const voxelOrTool = new MuUnion({
        voxel: new MuStruct({
            name: new MuUTF8(),
            destructible: new MuBoolean(),
        }),
        tool: new MuStruct({
            name: new MuUTF8(),
            durability: new MuFloat32(),
        }),
    });
    t.true(voxelOrTool.equal(
        {type: 'voxel', data: {name: 'soil', destructible: true}},
        {type: 'voxel', data: {name: 'soil', destructible: true}},
    ));
    t.true(voxelOrTool.equal(
        {type: 'tool', data: {name: 'torch', durability: 1}},
        {type: 'tool', data: {name: 'torch', durability: 1}},
    ));
    t.false(voxelOrTool.equal(
        {type: 'voxel', data: {name: 'soil', destructible: true}},
        {type: 'voxel', data: {name: 'water', destructible: false}},
    ));
    t.false(voxelOrTool.equal(
        {type: 'tool', data: {name: 'torch', durability: 1}},
        {type: 'tool', data: {name: 'torch', durability: 0.5}},
    ));
    t.false(voxelOrTool.equal(
        {type: 'voxel', data: {name: 'soil', destructible: true}},
        {type: 'tool', data: {name: 'torch', durability: 1}},
    ));
    t.end();
});

test('json.equal()', (t) => {
    const json = new MuJSON();
    t.true(json.equal({}, {}));
    t.true(json.equal({a: 0}, {a: 0}));
    t.true(json.equal({a: 0, b: NaN}, {a: 0, b: NaN}));
    t.true(json.equal({a: 0, b: 1}, {b: 1, a: 0}));
    t.false(json.equal({}, {a: 0}));
    t.false(json.equal({a: 0, b: 0}, {a: 0}));
    t.false(json.equal({a: 0}, {b: 0}));
    t.false(json.equal({a: 0}, {a: 1}));

    t.true(json.equal({a: {}}, {a: {}}));
    t.true(json.equal({a: {}, b: {}}, {a: {}, b: {}}));
    t.true(json.equal({a: {b: 0}}, {a: {b: 0}}));
    t.true(json.equal({a: {b: 0, c: 1}}, {a: {b: 0, c: 1}}));
    t.true(json.equal(
        {a: {c: 0}, b: {d: 1}},
        {a: {c: 0}, b: {d: 1}},
    ));
    t.true(json.equal(
        {a: {c: 0, d: 1}, b: {c: 0, d: 1}},
        {a: {c: 0, d: 1}, b: {c: 0, d: 1}},
    ));
    t.false(json.equal({}, {a: {}}));
    t.false(json.equal({a: {}, b: {}}, {a: {}}));
    t.false(json.equal({a: {}}, {b: {}}));
    t.false(json.equal({a: {b: 0}}, {a: {b: 1}}));

    t.true(json.equal([], []));
    t.false(json.equal([], {}));
    t.true(json.equal([0.5], [0.5]));
    t.true(json.equal([0.5, NaN], [0.5, NaN]));
    t.false(json.equal([], [0]));
    t.false(json.equal([0, 1], [0]));
    t.false(json.equal([0], [1]));
    t.false(json.equal([0, 0.5, 1], [0, 1, 0.5]));

    t.true(json.equal([], []));
    t.true(json.equal([[]], [[]]));
    t.true(json.equal([[0.5]], [[0.5]]));
    t.true(json.equal([[0.5, 0, 1]], [[0.5, 0, 1]]));
    t.true(json.equal(
        [[0.5, 0, 1], [0, 0.5, 1]],
        [[0.5, 0, 1], [0, 0.5, 1]],
    ));
    t.false(json.equal([[]], []));
    t.false(json.equal([[0]], [[]]));
    t.false(json.equal([[0, 1]], [[0]]));
    t.false(json.equal([[1]], [[0]]));
    t.false(json.equal([[0, 1, 0.5]], [[0, 0.5, 1]]));
    t.false(json.equal(
        [[0.5, 0, 1], [0, 0.5, 1]],
        [[0.5, 0, 1]],
    ));
    t.false(json.equal(
        [[0.5, 0, 1], [0, 0.5, 1]],
        [[0, 0.5, 1], [0.5, 0, 1]],
    ));
    t.end();
});
