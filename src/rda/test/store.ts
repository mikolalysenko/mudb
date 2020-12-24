import * as tape from 'tape';
import { MuStruct, MuFloat64, MuUTF8, MuSchema, MuASCII, MuFloat32, MuDate, MuBoolean, MuVarint } from '../../schema';
import { MuRDAConstant, MuRDARegister, MuRDAList, MuRDAMap, MuRDAStruct, MuRDA } from '../index';

function createTest<T extends MuSchema<any>> (t:tape.Test, rda:MuRDA<T, any, any, any>) {
    return function (init:T['identity']) {
        const store = rda.createStore(init);
        const state = store.state(rda, rda.stateSchema.identity);
        t.deepEqual(state, init, `store initial head state: ${typeof state !== 'number' ? JSON.stringify(state) : state}`);
        const serialized = store.serialize(rda, rda.storeSchema.alloc());
        const replicated = rda.parse(serialized);
        const replicatedState = replicated.state(rda, rda.stateSchema.alloc());
        t.deepEqual(replicatedState, init, `replicated store initial head state: ${typeof replicatedState !== 'number' ? JSON.stringify(replicatedState) : replicatedState}`);
    };
}

tape('constant', (t) => {
    const testAscii = createTest(t, new MuRDAConstant(new MuASCII()));
    testAscii('');
    testAscii('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/');

    const testFloat = createTest(t, new MuRDAConstant(new MuFloat32()));
    testFloat(0);
    testFloat(Math.E);
    testFloat(Infinity);
    testFloat(-Infinity);

    const testDate = createTest(t, new MuRDAConstant(new MuDate()));
    testDate(new Date(0));
    testDate(new Date(1000));
    testDate(new Date());

    const testStruct = createTest(t, new MuRDAConstant(new MuStruct({
        s: new MuStruct({
            a: new MuASCII(),
            f: new MuFloat64(),
            d: new MuDate(),
        }),
    })));
    testStruct({s: {a: '', f: 0, d: new Date(0)}});
    testStruct({s: {a: 'foo', f: 1.111, d: new Date()}});
    t.end();
});

tape('register', (t) => {
    const testUtf8 = createTest(t, new MuRDARegister(new MuUTF8()));
    testUtf8('');
    testUtf8('Iñtërnâtiônàlizætiøn☃💩');

    const testFloat = createTest(t, new MuRDARegister(new MuFloat64()));
    testFloat(0);
    testFloat(Math.E);
    testFloat(Infinity);
    testFloat(-Infinity);

    const testDate = createTest(t, new MuRDARegister(new MuDate()));
    testDate(new Date(0));
    testDate(new Date(1000));
    testDate(new Date());

    const testStruct = createTest(t, new MuRDARegister(new MuStruct({
        s: new MuStruct({
            a: new MuASCII(),
            f: new MuFloat64(),
            d: new MuDate(),
        }),
    })));
    testStruct({s: {a: '', f: 0, d: new Date(0)}});
    testStruct({s: {a: 'foo', f: 1.111, d: new Date()}});
    t.end();
});

function createTestPair<T extends MuSchema<any>> (t:tape.Test, rda:MuRDA<T, any, any, any>) {
    function testSerializeParse (inpState:T['identity'], outState:T['identity']) {
        const store = rda.createStore(inpState);
        const out = rda.createStore(outState).serialize(rda, rda.storeSchema.alloc());
        const serialized = store.serialize(rda, out);
        const replicated = rda.parse(serialized);
        const replicatedState = replicated.state(rda, rda.stateSchema.alloc());
        t.deepEqual(replicatedState, inpState, JSON.stringify(inpState));
    }

    return function (a:T['identity'], b:T['identity']) {
        testSerializeParse(a, a);
        testSerializeParse(b, b);
        testSerializeParse(rda.stateSchema.alloc(), a);
        testSerializeParse(rda.stateSchema.alloc(), b);
        testSerializeParse(a, rda.stateSchema.alloc());
        testSerializeParse(b, rda.stateSchema.alloc());
        testSerializeParse(a, b);
        testSerializeParse(b, a);
    };
}

tape('list', (t) => {
    const L = new MuRDAList(
        new MuRDAList(
            new MuRDAList(new MuRDARegister(new MuASCII())),
        ),
    );
    const testPair = createTestPair(t, L);
    testPair([[]], [[[]]]);
    testPair([[]], [[[]], [[]]]);
    testPair([[], []], [[['foo']]]);
    testPair([[['foo', 'bar']]], [[], [['foo', 'bar']]]);
    testPair([[], [[]], [['foo', 'bar']]], [[['foo'], ['foo', 'bar'], ['foo', 'bar', 'baz']]]);
    t.end();
});

tape('list of maps', (t) => {
    const L = new MuRDAList(
        new MuRDAMap(new MuVarint(), new MuRDARegister(new MuDate())),
    );
    const testPair = createTestPair(t, L);
    testPair([{}], [{}, {}]);
    testPair([{100: new Date(100)}], [{100: new Date(100), 1000: new Date(1000), 10000: new Date(10000)}]);
    testPair([{100: new Date(100), 1000: new Date(1000)}], [{100: new Date(100)}, {1000: new Date(1000)}]);
    t.end();
});

tape('list of structs', (t) => {
    const L = new MuRDAList(
        new MuRDAStruct({
            a: new MuRDARegister(new MuASCII()),
            f: new MuRDARegister(new MuFloat64()),
            d: new MuRDARegister(new MuDate()),
        }),
    );
    const testPair = createTestPair(t, L);
    testPair(
        [{a: 'foo', f: 1.1111, d: new Date(1000)}],
        [{a: 'foo', f: 1.1111, d: new Date(1000)}, {a: 'bar', f: 2.2222, d: new Date(10000)}],
    );
    testPair(
        [{a: 'foo', f: 1.1111, d: new Date(1000)}, {a: 'bar', f: 2.2222, d: new Date(10000)}, {a: 'baz', f: 3.3333, d: new Date()}],
        [{a: 'baz', f: 3.3333, d: new Date()}, {a: 'foo', f: 1.1111, d: new Date(1000)}, {a: 'bar', f: 2.2222, d: new Date(10000)}],
    );
    t.end();
});

tape('map', (t) => {
    const M = new MuRDAMap(
        new MuASCII(),
        new MuRDAMap(
            new MuASCII(),
            new MuRDAMap(
                new MuASCII(),
                new MuRDARegister(new MuStruct({
                    u: new MuASCII(),
                    d: new MuDate(),
                })),
            ),
        ),
    );
    const testPair = createTestPair(t, M);
    testPair(
        {foo: {bar: {baz: {u: 'foo', d: new Date(1000)}}}},
        {
            foo: {bar: {baz: {u: 'bar', d: new Date(1000)}}},
            bar: {
                foo: {bar: {u: 'baz', d: new Date(10000)}},
                bar: {
                    foo: {u: 'qux', d: new Date(100000)},
                    bar: {u: 'quux', d: new Date(1000000)},
                },
            },
        },
    );
    t.end();
});

tape('map of lists', (t) => {
    const M = new MuRDAMap(
        new MuASCII(),
        new MuRDAList(new MuRDARegister(new MuASCII())),
    );
    const testPair = createTestPair(t, M);
    testPair({foo: []}, {bar: [], baz: []});
    testPair({foo: ['foo']}, {foo: ['bar'], bar: ['baz']});
    testPair({foo: ['foo', 'bar']}, {foo: ['bar', 'baz']});
    t.end();
});

tape('map of structs', (t) => {
    const M = new MuRDAMap(
        new MuASCII(),
        new MuRDAStruct({
            a: new MuRDARegister(new MuASCII()),
            f: new MuRDARegister(new MuFloat64()),
            d: new MuRDARegister(new MuDate()),
        }),
    );
    const testPair = createTestPair(t, M);
    testPair(
        {foo: {a: 'foo', f: 1.1111, d: new Date(1000)}},
        {foo: {a: 'bar', f: 2.2222, d: new Date(10000)}},
    );
    testPair(
        {foo: {a: 'foo', f: 1.1111, d: new Date(1000)}, bar: {a: 'bar', f: 2.2222, d: new Date(10000)}},
        {baz: {a: 'foo', f: 1.1111, d: new Date(1000)}, qux: {a: 'bar', f: 2.2222, d: new Date(10000)}},
    );
    t.end();
});

tape('struct', (t) => {
    const S = new MuRDAStruct({
        s: new MuRDAStruct({
            s: new MuRDAStruct({
                b: new MuRDARegister(new MuBoolean()),
                a: new MuRDARegister(new MuASCII()),
                f: new MuRDARegister(new MuFloat64()),
                v: new MuRDARegister(new MuVarint()),
                d: new MuRDARegister(new MuDate()),
            }),
        }),
    });
    const testPair = createTestPair(t, S);
    testPair(
        {s: {s: {b: false, a: 'foo', f: 1.1111, v: 127, d: new Date(1000)}}},
        {s: {s: {b: true, a: 'bar', f: 2.2222, v: 128, d: new Date()}}},
    );
    t.end();
});

tape('struct of lists', (t) => {
    const S = new MuRDAStruct({
        l: new MuRDAList(new MuRDARegister(new MuASCII())),
    });
    const testPair = createTestPair(t, S);
    testPair({l: ['foo']}, {l: ['foo', 'bar']});
    testPair({l: ['foo', 'bar', 'baz']}, {l: ['bar', 'baz', 'foo']});
    t.end();
});

tape('struct of maps', (t) => {
    const S = new MuRDAStruct({
        m: new MuRDAMap(new MuASCII(), new MuRDARegister(new MuASCII())),
    });
    const testPair = createTestPair(t, S);
    testPair({m: {foo: 'foo'}}, {m: {foo: 'bar', bar: 'bar'}});
    testPair({m: {foo: 'foo', bar: 'bar', baz: 'baz'}}, {m: {foo: 'bar', bar: 'baz', baz: 'foo'}});
    t.end();
});
