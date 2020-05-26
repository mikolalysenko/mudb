import tape = require('tape');
import { MuFloat64, MuArray, MuUTF8, MuVarint } from '../../schema';
import { MuRDA, MuRDAStore, MuRDARegister, MuRDAMap } from '../index';

function createTest<T extends MuRDA<any, any, any, any>> (t:tape.Test, store:MuRDAStore<T>, rda:T) {
    return function (action:T['actionSchema']['identity'], expected:T['stateSchema']['identity']) {
        const json = JSON.stringify(action);
        store.apply(rda, action);
        t.deepEqual(store.state(rda, rda.stateSchema.alloc()), expected, json);
    };
}

tape('register of float', (t) => {
    const R = new MuRDARegister(new MuFloat64(), (x) => Math.max(0, Math.min(1, +x || 0)));
    t.equal(R.action(0.1), 0.1);
    t.equal(R.action(-0.1), 0);
    t.equal(R.action(1.1), 1);
    t.equal(R.action(NaN), 0);
    t.end();
});

tape('register of array', (t) => {
    const constrain = (a:number[]) => a.map((x) => Math.max(0, Math.min(1, +x || 0)));
    const R = new MuRDARegister(new MuArray(new MuFloat64(), Infinity), constrain);
    t.deepEqual(R.action([]), []);
    t.deepEqual(R.action([NaN, -0.1, 0, 0.1, 0.5, 1, 1.1]), [0, 0, 0, 0.1, 0.5, 1, 1]);
    t.end();
});

tape('boolean set constraint', (t) => {
    const M = new MuRDAMap(new MuUTF8(), new MuRDARegister(new MuVarint()), {
        set: false,
    });
    const store = M.createStore({foo: 127, bar: 128, baz: 129});
    const dispatchers = M.action(store);
    const test = createTest(t, store, M);

    test(dispatchers.set('foo', 128), {foo: 127, bar: 128, baz: 129});
    test(dispatchers.set('bar', 129), {foo: 127, bar: 128, baz: 129});
    test(dispatchers.set('baz', 130), {foo: 127, bar: 128, baz: 129});
    test(dispatchers.set('qux', 131), {foo: 127, bar: 128, baz: 129});
    t.end();
});

tape('function set constraint', (t) => {
    const M = new MuRDAMap(new MuUTF8(), new MuRDARegister(new MuVarint()), {
        set: (k, v) => k !== 'foo',
    });
    const store = M.createStore({foo: 127, bar: 128, baz: 129});
    const dispatchers = M.action(store);
    const test = createTest(t, store, M);

    test(dispatchers.set('foo', 128), {foo: 127, bar: 128, baz: 129});
    test(dispatchers.set('bar', 129), {foo: 127, bar: 129, baz: 129});
    test(dispatchers.set('baz', 130), {foo: 127, bar: 129, baz: 130});
    test(dispatchers.set('qux', 131), {foo: 127, bar: 129, baz: 130, qux: 131});
    t.end();
});

tape('boolean remove constraint', (t) => {
    const M = new MuRDAMap(new MuUTF8(), new MuRDARegister(new MuVarint()), {
        remove: false,
    });
    const store = M.createStore({foo: 127, bar: 128, baz: 129});
    const dispatchers = M.action(store);
    const test = createTest(t, store, M);

    test(dispatchers.remove('foo'), {foo: 127, bar: 128, baz: 129});
    test(dispatchers.remove('bar'), {foo: 127, bar: 128, baz: 129});
    test(dispatchers.remove('baz'), {foo: 127, bar: 128, baz: 129});
    t.end();
});

tape('function remove constraint', (t) => {
    const M = new MuRDAMap(new MuUTF8(), new MuRDARegister(new MuVarint()), {
        remove: (k) => k !== 'foo',
    });
    const store = M.createStore({foo: 127, bar: 128, baz: 129});
    const dispatchers = M.action(store);
    const test = createTest(t, store, M);

    test(dispatchers.remove('foo'), {foo: 127, bar: 128, baz: 129});
    test(dispatchers.remove('bar'), {foo: 127, baz: 129});
    test(dispatchers.remove('baz'), {foo: 127});
    t.end();
});

tape('boolean move constraint', (t) => {
    const M = new MuRDAMap(new MuUTF8(), new MuRDARegister(new MuVarint()), {
        move: false,
    });
    const store = M.createStore({foo: 127, bar: 128, baz: 129});
    const dispatchers = M.action(store);
    const test = createTest(t, store, M);

    test(dispatchers.move('foo', 'bar'), {foo: 127, bar: 128, baz: 129});
    test(dispatchers.move('bar', 'baz'), {foo: 127, bar: 128, baz: 129});
    test(dispatchers.move('baz', 'qux'), {foo: 127, bar: 128, baz: 129});
    t.end();
});

tape('function move constraint', (t) => {
    const M = new MuRDAMap(new MuUTF8(), new MuRDARegister(new MuVarint()), {
        move: (from, to) => from !== 'foo' && to !== 'foo',
    });
    const store = M.createStore({foo: 127, bar: 128, baz: 129});
    const dispatchers = M.action(store);
    const test = createTest(t, store, M);

    test(dispatchers.move('foo', 'bar'), {foo: 127, bar: 128, baz: 129});
    test(dispatchers.move('bar', 'foo'), {foo: 127, bar: 128, baz: 129});
    test(dispatchers.move('bar', 'baz'), {foo: 127, baz: 128});
    test(dispatchers.move('baz', 'qux'), {foo: 127, qux: 128});
    t.end();
});

tape('maxKeyLength', (t) => {
    let M = new MuRDAMap(new MuUTF8(), new MuRDARegister(new MuVarint()));
    t.equal(M.constrain.maxKeyLength, Infinity);
    M = new MuRDAMap(new MuUTF8(), new MuRDARegister(new MuVarint()), { maxKeyLength: -5.1 });
    t.equal(M.constrain.maxKeyLength, Infinity);
    M = new MuRDAMap(new MuUTF8(), new MuRDARegister(new MuVarint()), { maxKeyLength: -0.1 });
    t.equal(M.constrain.maxKeyLength, Infinity);
    M = new MuRDAMap(new MuUTF8(), new MuRDARegister(new MuVarint()), { maxKeyLength: 0.99 });
    t.equal(M.constrain.maxKeyLength, Infinity);
    M = new MuRDAMap(new MuUTF8(), new MuRDARegister(new MuVarint()), { maxKeyLength: NaN });
    t.equal(M.constrain.maxKeyLength, Infinity);
    M = new MuRDAMap(new MuUTF8(), new MuRDARegister(new MuVarint()), { maxKeyLength: 1 });
    t.equal(M.constrain.maxKeyLength, 1);
    M = new MuRDAMap(new MuUTF8(), new MuRDARegister(new MuVarint()), { maxKeyLength: 1.1 });
    t.equal(M.constrain.maxKeyLength, 1);
    M = new MuRDAMap(new MuUTF8(), new MuRDARegister(new MuVarint()), { maxKeyLength: 3 });
    t.equal(M.constrain.maxKeyLength, 3);
    M = new MuRDAMap(new MuUTF8(), new MuRDARegister(new MuVarint()), { maxKeyLength: 3.1 });
    t.equal(M.constrain.maxKeyLength, 3);

    const store = M.createStore({});
    const dispatchers = M.action(store);
    const test = createTest(t, store, M);

    test(dispatchers.set('foo', 127), {foo: 127});
    test(dispatchers.set('bar', 128), {foo: 127, bar: 128});
    test(dispatchers.set('quxx', 129), {foo: 127, bar: 128});
    test(dispatchers.move('bar', 'baz'), {foo: 127, baz: 128});
    test(dispatchers.move('foo', 'quxx'), {foo: 127, baz: 128});
    t.end();
});
