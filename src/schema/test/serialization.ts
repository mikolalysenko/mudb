import tape = require('tape');
import {
    MuWriteStream,
    MuReadStream,
} from '../../stream';
import {
    MuSchema,
    MuBoolean,
    MuASCII,
    MuFixedASCII,
    MuUTF8,
    MuFloat32,
    MuFloat64,
    MuInt8,
    MuInt16,
    MuInt32,
    MuUint8,
    MuUint16,
    MuUint32,
    MuArray,
    MuSortedArray,
    MuVector,
    MuDictionary,
    MuStruct,
    MuUnion,
} from '../index';
import { MuString } from '../_string';
import { MuNumber } from '../_number';
import {
    randBool,
    randFloat32,
    randArray,
    randVec,
    randDict,
} from '../util/random';

function createTest<T> (
    t:tape.Test,
    schema:MuSchema<T>,
) : (base:MuSchema<T>['identity'], target:MuSchema<T>['identity']) => void {
    return (base, target) => {
        const out = new MuWriteStream(1);
        if (schema.diff(base, target, out)) {
            t.notDeepEqual(base, target, 'diff() implied values are not identical');
            t.true(out.offset > 0, 'at least one byte should be written to stream');
            const inp = new MuReadStream(out.bytes());
            t.deepEqual(schema.patch(base, inp), target, 'patched value should be identical to target');
            t.equal(inp.offset, inp.length, 'patch() should consume all bytes on stream');
        } else {
            t.deepEqual(base, target, 'diff() implied values are identical');
            t.equal(out.offset, 0, 'no bytes should be written to stream');
        }
    };
}

const compare = (a, b) => a - b;

(<any>tape).onFailure(() => {
    process.exit(1);
});

tape('de/serializing boolean', (t) => {
    const bool = new MuBoolean();
    const test = createTest(t, bool);
    test(true, true);
    test(false, false);
    test(true, false);
    test(false, true);
    t.end();
});

tape('de/serializing string', (t) => {
    function createTestPair (
        _t:tape.Test,
        schema:MuString,
    ) : (a:string, b:string) => void {
        const test = createTest(_t, schema);
        return (a, b) => {
            test(a, a);
            test(b, b);
            test(a, b);
            test(b, a);
            test('', a);
            test('', b);
        };
    }

    t.test('ascii', (st) => {
        const ascii = new MuASCII();
        const testPair = createTestPair(st, ascii);
        testPair('', ' ');
        testPair('a', 'b');
        testPair('a', '<a href="https://github.com/mikolalysenko/mudb/">mudb</a>');

        const codePoints = new Array(0x80);
        for (let i = 0; i < codePoints.length; ++i) {
            codePoints[i] = i;
        }
        testPair(
            String.fromCharCode.apply(null, codePoints),
            String.fromCharCode.apply(null, codePoints.reverse()),
        );
        st.end();
    });

    t.test('fixed-ascii', (st) => {
        const fixedAscii = new MuFixedASCII(32);
        const test = createTest(st, fixedAscii);
        test('https://github.com/mikolalysenko', 'https://github.com/mikolalysenko');
        test('e42dfecf821ebdfce692c7692b18d2b1', 'https://github.com/mikolalysenko');
        test('https://github.com/mikolalysenko', 'e42dfecf821ebdfce692c7692b18d2b1');
        st.throws(() => test('', 'https://github.com/mikolalysenko'));
        st.throws(() => test('https://github.com/mikolalysenko', ''));
        st.end();
    });

    t.test('utf8', (st) => {
        const utf8 = new MuUTF8();
        const testPair = createTestPair(st, utf8);
        testPair('', ' ');
        testPair('<a href="https://github.com/mikolalysenko/mudb/">mudb</a>', 'Iñtërnâtiônàlizætiøn☃💩');
        testPair('<a href="https://github.com/mikolalysenko/mudb/">mudb</a>', '💩💩💩💩💩💩💩💩💩💩💩💩💩💩💩');
        st.end();
    });
});

tape('de/serializing number', (t) => {
    function createTestPair (
        _t:tape.Test,
        schema:MuNumber,
    ) : (a:number, b:number) => void {
        const test = createTest(_t, schema);
        return (a, b) => {
            test(a, a);
            test(b, b);
            test(a, b);
            test(b, a);
        };
    }

    const testFloat32 = createTestPair(t, new MuFloat32());
    testFloat32(-3.4028234663852886e+38, 3.4028234663852886e+38);
    const testFloat64 = createTestPair(t, new MuFloat64());
    testFloat64(-1.7976931348623157e+308, 1.7976931348623157e+308);
    const testInt8 = createTestPair(t, new MuInt8());
    testInt8(-0x80, 0x7F);
    const testInt16 = createTestPair(t, new MuInt16());
    testInt16(-0x8000, 0x7FFF);
    const testInt32 = createTestPair(t, new MuInt32());
    testInt32(-0x80000000, 0x7FFFFFFF);
    const testUint8 = createTestPair(t, new MuUint8());
    testUint8(0, 0xFF);
    const testUint16 = createTestPair(t, new MuUint16());
    testUint16(0, 0xFFFF);
    const testUint32 = createTestPair(t, new MuUint32());
    testUint32(0, 0xFFFFFFFF);
    t.end();
});

tape('de/serializing array', (t) => {
    function createTestPair (
        _t:tape.Test,
        schema:MuArray<any>,
    ) : (a:any[], b:any[]) => void {
        const test = createTest(_t, schema);
        return (a, b) => {
            test(a, a);
            test(b, b);
            test(a, b);
            test(b, a);
            test([], a);
            test([], b);
        };
    }

    function randNestedArray () {
        const na = new Array(Math.random() * 10 | 0);
        for (let i = 0; i < na.length; ++i) {
            na[i] = randArray();
        }
        return na;
    }

    t.test('simple array', (st) => {
        const array = new MuArray(new MuFloat32());
        const testPair = createTestPair(st, array);
        testPair([0], [1]);
        testPair([0, 1], [1, 1]);
        testPair([0, 1], [0, 2]);
        testPair([0, 1], [0.5, 1.5]);
        testPair([0], [0, 1]);
        testPair([0, 1], [1, 2, 3]);
        for (let i = 0; i < 1000; ++i) {
            testPair(randArray(), randArray());
        }
        st.end();
    });

    t.test('nested array', (st) => {
        const array = new MuArray(
            new MuArray(new MuFloat32()),
        );
        const testPair = createTestPair(st, array);
        testPair([[]], [[], []]);
        for (let i = 0; i < 1000; ++i) {
            testPair(randNestedArray(), randNestedArray());
        }
        st.end();
    });
});

tape('de/serializing sorted array', (t) => {
    function createTestPair (
        _t:tape.Test,
        schema:MuSortedArray<any>,
    ) : (a:any[], b:any[]) => void {
        const test = createTest(_t, schema);
        return (a, b) => {
            a.sort(compare);
            b.sort(compare);
            test(a, a);
            test(b, b);
            test(a, b);
            test(b, a);
            test([], a);
            test([], b);
        };
    }

    const sortedArray = new MuSortedArray(new MuFloat32());
    const testPair = createTestPair(t, sortedArray);
    testPair([0], [1]);
    testPair([0, 1], [1, 1]);
    testPair([0, 1], [0, 2]);
    testPair([0, 1], [0.5, 1.5]);
    testPair([0], [0, 1]);
    testPair([0, 1], [1, 2, 3]);
    for (let i = 0; i < 1000; ++i) {
        testPair(randArray(), randArray());
    }
    t.end();
});

tape('de/serializing vector', (t) => {
    function createTestPair (
        _t:tape.Test,
        schema:MuVector<any>,
    ) : (a:Float32Array, b:Float32Array) => void {
        const test = createTest(_t, schema);
        return (a, b) => {
            test(a, a);
            test(b, b);
            test(a, b);
            test(b, a);
            test(schema.alloc(), a);
            test(schema.alloc(), b);
        };
    }

    t.test('vec0', (st) => {
        const vector = new MuVector(new MuFloat32(), 0);
        const test = createTest(st, vector);
        const zeroA = vector.alloc();
        const zeroB = vector.alloc();
        test(zeroA, zeroB);
        st.end();
    });

    t.test('vec1', (st) => {
        const vector = new MuVector(new MuFloat32(), 1);
        const testPair = createTestPair(st, vector);
        for (let i = 0; i < 10; ++i) {
            testPair(randVec(1), randVec(1));
        }
        st.end();
    });

    t.test('vec2', (st) => {
        const vector = new MuVector(new MuFloat32(), 2);
        const testPair = createTestPair(st, vector);
        for (let i = 0; i < 100; ++i) {
            testPair(randVec(2), randVec(2));
        }
        st.end();
    });

    t.test('vec3', (st) => {
        const vector = new MuVector(new MuFloat32(), 3);
        const testPair = createTestPair(st, vector);
        for (let i = 0; i < 1000; ++i) {
            testPair(randVec(3), randVec(3));
        }
        st.end();
    });

    t.test('vec10000', (st) => {
        const vector = new MuVector(new MuFloat32(), 10000);
        const testPair = createTestPair(st, vector);
        for (let i = 0; i < 10; ++i) {
            testPair(randVec(10000), randVec(10000));
        }
        st.end();
    });
});

tape('de/serializing dictionary', (t) => {
    function createTestPair<T extends MuSchema<any>> (
        _t:tape.Test,
        schema:MuDictionary<T>,
    ) : (a:MuDictionary<T>['identity'], b:MuDictionary<T>['identity']) => void {
        const test = createTest(_t, schema);
        return (a, b) => {
            test(a, a);
            test(b, b);
            test(a, b);
            test(b, a);
            test({}, a);
            test({}, b);
        };
    }

    function randNestedDict () {
        const nd = {};
        let code = 97 + Math.random() * 6 | 0;
        for (let i = Math.random() * 6 | 0; i > 0; --i) {
            nd[String.fromCharCode(code++)] = randDict();
        }
        return nd;
    }

    t.test('simple dictionary', (st) => {
        const dictionary = new MuDictionary(new MuFloat32());
        const testPair = createTestPair(st, dictionary);
        testPair({f: 0}, {f: 0.5});
        testPair({f: 0, g: 0.5}, {f: 0, g: 1});
        testPair({f: 0, g: 0.5}, {f: 1, g: 0.5});
        testPair({f: 0, g: 0.5}, {f: 1, g: 1.5});
        testPair({f: 0}, {g: 0});
        testPair({f: 0}, {g: 0.5});
        testPair({f: 0, g: 0.5}, {g: 1, h: 1.5});
        testPair({f: 0, g: 0.5}, {h: 1, i: 1.5});
        testPair({f: 0}, {f: 0, g: 0.5});
        testPair({f: 0}, {f: 0.5, g: 1});
        for (let i = 0; i < 1000; ++i) {
            testPair(randDict(), randDict());
        }
        st.end();
    });

    t.test('nested dictionary', (st) => {
        const dictionary = new MuDictionary(
            new MuDictionary(new MuFloat32()),
        );
        const testPair = createTestPair(st, dictionary);
        testPair({a: {a: 0}}, {a: {b: 0.5}});
        testPair({a: {a: 0}, b: {a: 0}}, {a: {a: 0}, b: {b: 0.5}});
        testPair({a: {a: 0}, b: {a: 0}}, {a: {b: 0.5}, b: {a: 0}});
        testPair({a: {a: 0}, b: {a: 0}}, {a: {b: 0.5}, b: {b: 0.5}});
        testPair({a: {a: 0}}, {b: {a: 0}});
        testPair({a: {a: 0}}, {b: {b: 0}});
        testPair({a: {a: 0}, b: {a: 0}}, {b: {b: 0.5}, c: {a: 0}});
        testPair({a: {a: 0}, b: {a: 0}}, {c: {a: 0}, d: {a: 0}});
        testPair({a: {a: 0}}, {a: {b: 0.5}, b: {a: 0}});
        testPair({a: {a: 0}}, {b: {a: 0.5}, c: {a: 0.5}});
        for (let i = 0; i < 1000; ++i) {
            testPair(randNestedDict(), randNestedDict());
        }
        st.end();
    });
});

tape('de/serializing struct', (t) => {
    function createTestPair<T extends {[prop:string]:MuSchema<any>}> (
        _t:tape.Test,
        schema:MuStruct<T>,
    ) : (a:MuStruct<T>['identity'], b:MuStruct<T>['identity']) => void {
        const test = createTest(_t, schema);
        return (a, b) => {
            test(a, a);
            test(b, b);
            test(a, b);
            test(b, a);
            test(schema.alloc(), a);
            test(schema.alloc(), b);
        };
    }

    const struct = new MuStruct({
        b: new MuBoolean(),
        u: new MuUTF8(),
        f: new MuFloat32(),
        a: new MuArray(new MuFloat32()),
        sa: new MuSortedArray(new MuFloat32()),
        v: new MuVector(new MuFloat32(), 9),
        d: new MuDictionary(new MuFloat32()),
        s: new MuStruct({
            b: new MuBoolean(),
            u: new MuUTF8(),
            f: new MuFloat32(),
        }),
    });

    const strings = [
        '',
        '<a href="https://github.com/mikolalysenko/mudb/">mudb</a>',
        'Iñtërnâtiônàlizætiøn☃💩',
    ];

    function createStruct () {
        const s = struct.alloc();
        s.b = randBool();
        s.u = strings[Math.random() * 3 | 0];
        s.f = randFloat32();
        s.a = randArray();
        s.sa = randArray().sort(compare);
        s.v = randVec(9);
        s.d = randDict();
        s.s.b = randBool();
        s.s.u = strings[Math.random() * 3 | 0];
        s.s.f = randFloat32();
        return s;
    }

    const testPair = createTestPair(t, struct);
    for (let i = 0; i < 2000; ++i) {
        testPair(createStruct(), createStruct());
    }
    t.end();
});

tape('de/serializing union', (t) => {
    function createTestPair<T extends {[prop:string]:MuSchema<any>}> (
        _t:tape.Test,
        schema:MuUnion<T>,
    ) : (a:MuUnion<T>['identity'], b:MuUnion<T>['identity']) => void {
        const test = createTest(_t, schema);
        return (a, b) => {
            test(a, a);
            test(b, b);
            test(a, b);
            test(b, a);
        };
    }

    const spec = {
        b: new MuBoolean(),
        u: new MuUTF8(),
        f: new MuFloat32(),
        a: new MuArray(new MuFloat32()),
        sa: new MuSortedArray(new MuFloat32()),
        v: new MuVector(new MuFloat32(), 16),
        d: new MuDictionary(new MuFloat32()),
    };
    const tags = Object.keys(spec) as (keyof typeof spec)[];
    const numTags = tags.length;

    const strings = [
        '',
        '<a href="https://github.com/mikolalysenko/mudb/">mudb</a>',
        'Iñtërnâtiônàlizætiøn☃💩',
    ];

    function randUnionCase () {
        const type = tags[Math.random() * numTags | 0];
        let data;
        switch (type) {
            case 'b':
                data = randBool();
                break;
            case 'u':
                data = strings[Math.random() * strings.length | 0];
                break;
            case 'f':
                data = randFloat32();
                break;
            case 'a':
                data = randArray();
                break;
            case 'sa':
                data = randArray().sort(compare);
                break;
            case 'v':
                data = randVec(16);
                break;
            case 'd':
                data = randDict();
                break;
        }
        return {
            type,
            data,
        };
    }

    const union = new MuUnion(spec);
    const testPair = createTestPair(t, union);
    for (let i = 0; i < 1000; ++i) {
        testPair(randUnionCase(), randUnionCase());
    }
    t.end();
});
