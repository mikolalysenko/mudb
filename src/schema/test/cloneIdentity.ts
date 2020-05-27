import tape = require('tape');
import { MuBoolean, MuFloat32, MuFloat64, MuInt8, MuInt16, MuInt32, MuUint8, MuUint16, MuUint32, MuVarint, MuRelativeVarint, MuASCII, MuFixedASCII, MuUTF8, MuArray, MuSchema, MuBytes, MuDate, MuDictionary, MuJSON, MuOption, MuSortedArray, MuStruct, MuUnion, MuVector } from '../index';
import { isMuPrimitiveType } from '../is-primitive';

tape('boolean.cloneIdentity()', (t) => {
    t.false(new MuBoolean(false).cloneIdentity());
    t.true(new MuBoolean(true).cloneIdentity());
    t.end();
});

tape('number.cloneIdentity()', (t) => {
    t.equal(new MuFloat32(0).cloneIdentity(), 0);
    t.equal(new MuFloat64(0).cloneIdentity(), 0);
    t.equal(new MuInt8(0).cloneIdentity(), 0);
    t.equal(new MuInt16(0).cloneIdentity(), 0);
    t.equal(new MuInt32(0).cloneIdentity(), 0);
    t.equal(new MuUint8(0).cloneIdentity(), 0);
    t.equal(new MuUint16(0).cloneIdentity(), 0);
    t.equal(new MuUint32(0).cloneIdentity(), 0);
    t.equal(new MuVarint(0).cloneIdentity(), 0);
    t.equal(new MuRelativeVarint(0).cloneIdentity(), 0);

    t.equal(new MuFloat32(0.5).cloneIdentity(), 0.5);
    t.equal(new MuFloat32(Infinity).cloneIdentity(), Infinity);
    t.equal(new MuFloat32(-Infinity).cloneIdentity(), -Infinity);
    t.true(Number.isNaN(new MuFloat32(NaN).cloneIdentity()));
    t.equal(new MuFloat64(Math.PI).cloneIdentity(), Math.PI);
    t.equal(new MuFloat64(Infinity).cloneIdentity(), Infinity);
    t.equal(new MuFloat64(-Infinity).cloneIdentity(), -Infinity);
    t.true(Number.isNaN(new MuFloat64(NaN).cloneIdentity()));
    t.equal(new MuInt8(-0x80).cloneIdentity(), -0x80);
    t.equal(new MuInt16(-0x8000).cloneIdentity(), -0x8000);
    t.equal(new MuInt32(-0x80000000).cloneIdentity(), -0x80000000);
    t.equal(new MuUint8(0xff).cloneIdentity(), 0xff);
    t.equal(new MuUint16(0xffff).cloneIdentity(), 0xffff);
    t.equal(new MuUint32(0xffffffff).cloneIdentity(), 0xffffffff);
    t.equal(new MuVarint(0xffffffff).cloneIdentity(), 0xffffffff);
    t.equal(new MuRelativeVarint(0xffffffff).cloneIdentity(), 0xffffffff);
    t.end();
});

tape('string.cloneIdentity()', (t) => {
    t.equal(new MuASCII('').cloneIdentity(), '');
    t.equal(new MuFixedASCII('').cloneIdentity(), '');
    t.equal(new MuUTF8('').cloneIdentity(), '');

    t.equal(new MuASCII('Qm').cloneIdentity(), 'Qm');
    t.equal(new MuFixedASCII('ffffffff').cloneIdentity(), 'ffffffff');
    t.equal(new MuUTF8('Iñtërnâtiônàlizætiøn☃💩').cloneIdentity(), 'Iñtërnâtiônàlizætiøn☃💩');
    t.end();
});

function createTest (t:tape.Test) {
    return function (schema:MuSchema<any>) {
        const identity = schema.identity;
        const identityClone = schema.cloneIdentity();
        t.notEqual(identityClone, identity, JSON.stringify(identity));
        t.deepEqual(identityClone, identity);

        const valueSchema = schema.muData;
        if (valueSchema && valueSchema.muType && !isMuPrimitiveType(valueSchema.muType)) {
            if (Array.isArray(identity)) {
                if (typeof identity[0] === 'object') {
                    t.notEqual(identityClone[0], identity[0], JSON.stringify(identity[0]));
                    t.deepEqual(identityClone[0], identity[0]);
                }
            } else if (typeof identity === 'object') {
                const key = Object.keys(identity)[0];
                if (typeof identity[key] === 'object') {
                    t.notEqual(identityClone[key], identity[key], JSON.stringify(identity[key]));
                    t.deepEqual(identityClone[key], identity[key]);
                }
            }
        }
    };
}

tape('array.cloneIdentity()', (t) => {
    const test = createTest(t);
    test(new MuArray(new MuUint8(), Infinity, []));
    test(new MuArray(new MuArray(new MuUint8(), Infinity), Infinity, []));
    test(new MuArray(new MuUint8(), Infinity, [2, 3, 1]));
    test(new MuArray(new MuArray(new MuUint8(), Infinity), Infinity, [[1], [3], [2]]));
    test(new MuArray(new MuASCII(), Infinity, ['b', 'a', 'c']));
    test(new MuArray(new MuArray(new MuASCII(), Infinity), Infinity, [['c'], ['a'], ['b']]));
    t.end();
});

tape('sorted.cloneIdentity()', (t) => {
    const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
    const test = createTest(t);
    test(new MuSortedArray(new MuUint8(), Infinity));
    test(new MuSortedArray(new MuSortedArray(new MuUint8(), Infinity), Infinity));
    test(new MuSortedArray(new MuUint8(), Infinity, compare, [2, 3, 1]));
    test(new MuSortedArray(new MuSortedArray(new MuUint8(), Infinity), Infinity, compare, [[1], [3], [2]]));
    test(new MuSortedArray(new MuASCII(), Infinity, compare, ['b', 'a', 'c']));
    test(new MuSortedArray(new MuSortedArray(new MuASCII(), Infinity), Infinity, compare, [['c'], ['a'], ['b']]));
    t.end();
});

tape('bytes.cloneIdentity()', (t) => {
    const test = createTest(t);
    test(new MuBytes(new Uint8Array(9)));
    test(new MuBytes(new Uint8Array([255, 255, 255])));
    t.end();
});

tape('date.cloneIdentity()', (t) => {
    const test = createTest(t);
    test(new MuDate(new Date(0)));
    test(new MuDate(new Date(10)));
    test(new MuDate(new Date(100)));
    test(new MuDate(new Date(1000)));
    t.end();
});

tape('dictionary.cloneIdentity()', (t) => {
    const test = createTest(t);
    test(new MuDictionary(new MuFloat64(), Infinity, {}));
    test(new MuDictionary(new MuDictionary(new MuFloat64(), Infinity), Infinity, {}));
    test(new MuDictionary(new MuFloat64(), Infinity, {foo: 0, bar: 0.5, baz: 1.5}));
    test(new MuDictionary(new MuDictionary(new MuFloat64(), Infinity), Infinity, {foo: {bar: 0.5, baz: 1.5}}));
    t.end();
});

tape('json.cloneIdentity()', (t) => {
    const test = createTest(t);
    test(new MuJSON({}));
    test(new MuJSON([]));

    const object = new MuJSON({foo: 0, bar: {baz: []}});
    test(object);
    t.notEqual(object.cloneIdentity()['bar'], object.identity['bar']);
    t.deepEqual(object.cloneIdentity()['bar'], object.identity['bar']);
    t.notEqual(object.cloneIdentity()['bar']['baz'], object.identity['bar']['baz']);
    t.deepEqual(object.cloneIdentity()['bar']['baz'], object.identity['bar']['baz']);

    const array = new MuJSON([0, {foo: [1, {bar: [{baz: 2}]}]}]);
    test(array);
    t.notEqual(array.cloneIdentity()[1], array.identity[1]);
    t.deepEqual(array.cloneIdentity()[1], array.identity[1]);
    t.notEqual(array.cloneIdentity()[1]['foo'], array.identity[1]['foo']);
    t.deepEqual(array.cloneIdentity()[1]['foo'], array.identity[1]['foo']);
    t.notEqual(array.cloneIdentity()[1]['foo'][1]['bar'][0], array.identity[1]['foo'][1]['bar'][0]);
    t.deepEqual(array.cloneIdentity()[1]['foo'][1]['bar'][0], array.identity[1]['foo'][1]['bar'][0]);
    t.end();
});

tape('option.cloneIdentity()', (t) => {
    const test = createTest(t);
    test(new MuOption(new MuArray(new MuFloat32(), Infinity), [0.5, 0.5, 0.5]));
    test(new MuOption(new MuArray(new MuFloat32(), Infinity, [0.5, 0.5, 0.5])));
    t.equal(new MuOption(new MuArray(new MuFloat32(), Infinity, [0.5, 0.5, 0.5]), undefined, true).cloneIdentity(), undefined);
    t.end();
});

tape('struct.cloneIdentity()', (t) => {
    const struct = new MuStruct({
        f: new MuFloat32(0.5),
        u: new MuUTF8('Iñtërnâtiônàlizætiøn☃💩'),
        v: new MuVector(new MuFloat32(0.5), 3),
    });
    t.notEqual(struct.cloneIdentity(), struct.identity, JSON.stringify(struct.identity));
    t.deepEqual(struct.cloneIdentity(), struct.identity);
    t.notEqual(struct.cloneIdentity().v, struct.identity.v, JSON.stringify(struct.identity.v));
    t.deepEqual(struct.cloneIdentity().v, struct.identity.v);
    t.end();
});

tape('union.cloneIdentity()', (t) => {
    const test = createTest(t);
    test(new MuUnion({f: new MuFloat32(), a: new MuArray(new MuFloat32(), Infinity)}));
    test(new MuUnion({f: new MuFloat32(), a: new MuArray(new MuFloat32(), Infinity)}, 'f'));
    test(new MuUnion({f: new MuFloat32(), a: new MuArray(new MuFloat32(), Infinity)}, 'a'));
    t.end();
});

tape('vector.cloneIdentity()', (t) => {
    const test = createTest(t);
    test(new MuVector(new MuFloat32(0.5), 3));
    test(new MuVector(new MuInt32(-0x80000000), 4));
    test(new MuVector(new MuUint8(0xff), 5));
    t.end();
});
