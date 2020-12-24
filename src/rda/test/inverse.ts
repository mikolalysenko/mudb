import * as test from 'tape';

import { MuFloat64, MuASCII, MuStruct, MuUint32, MuUTF8 } from '../../schema';
import { MuRDA, MuRDAStore, MuRDATypes } from '../index';
import { MuRDAConstant, MuRDARegister, MuRDAList, MuRDAMap, MuRDAStruct } from '../index';

function testInverse<
    RDA extends MuRDA<any, any, any, any>,
    Store extends MuRDAStore<RDA>> (t:test.Test, store:Store, rda:RDA, action:MuRDATypes<RDA>['action'], msg:string) {
    const origin = store.state(rda, rda.stateSchema.alloc());
    const inverse = store.inverse(rda, action);
    store.apply(rda, action);
    store.apply(rda, inverse);
    t.deepEqual(store.state(rda, rda.stateSchema.alloc()), origin, msg);
}

test('inverse - register', (t) => {
    const Uint32Reg = new MuRDARegister(new MuUint32());
    const Uint32RegStore = Uint32Reg.createStore(-54321);
    testInverse(t, Uint32RegStore, Uint32Reg, Uint32Reg.action(54321), 'set to 54321');

    const ModReg = new MuRDARegister(new MuStruct({
        name: new MuASCII(),
        version: new MuUint32(),
    }));
    const ModRegStore = ModReg.createStore({name: 'default', version: 1});
    testInverse(t, ModRegStore, ModReg, ModReg.action({name: `Don't Starve`, version: 101}), `set to Don't Starve mod`);
    t.end();
});

test('inverse - struct', (t) => {
    const S = new MuRDAStruct({
        r: new MuRDARegister(new MuStruct({
            a: new MuASCII(),
            f: new MuFloat64(),
        })),
        s: new MuRDAStruct({
            r: new MuRDARegister(new MuStruct({
                a: new MuASCII(),
                f: new MuFloat64(),
            })),
            s: new MuRDAStruct({
                a: new MuRDARegister(new MuASCII()),
                f: new MuRDARegister(new MuFloat64()),
            }),
        }),
    });
    const store = S.createStore(S.stateSchema.alloc());
    const dispatcher = S.action(store);

    const actions:any[] = [];
    actions.push(dispatcher.r({a: 'never', f: Infinity}));
    actions.push(dispatcher.s.r({a: 'vanishing', f: -Infinity}));
    actions.push(dispatcher.s.s.a('overlooked'));
    actions.push(dispatcher.s.s.f(0.0000000000000000000001));

    const inverses:any[] = [];
    for (let i = 0; i < actions.length; ++i) {
        inverses.push(store.inverse(S, actions[i]));
    }

    testInverse(t, store, S, actions[0], 'set r');
    testInverse(t, store, S, actions[1], 'set s.r');
    testInverse(t, store, S, actions[2], 'set s.s.a');
    testInverse(t, store, S, actions[3], 'set s.s.f');

    for (let i = 0; i < actions.length; ++i) {
        store.apply(S, actions[i]);
    }
    for (let i = 0; i < inverses.length; ++i) {
        store.apply(S, inverses[i]);
    }
    t.deepEqual(store.state(S, S.stateSchema.alloc()), S.stateSchema.alloc());
    t.end();
});

test('map', (t) => {
    const M = new MuRDAMap(
        new MuASCII(),
        new MuRDAConstant(new MuFloat64()),
    );
    const store = M.createStore({foo: 11.11, bar: 22.22, baz: 33.33});
    const dispatchers = M.action(store);

    const actions:any[] = [];
    actions.push(dispatchers.clear());
    actions.push(dispatchers.reset({foo: 22.22, bar: 22.22}));
    actions.push(dispatchers.set('foo', 33.33));
    actions.push(dispatchers.remove('foo'));
    actions.push(dispatchers.move('bar', 'baz'));
    actions.push(dispatchers.move('baz', 'qux'));
    actions.push(dispatchers.set('qux', 44.44));
    actions.push(dispatchers.set('quux', 55.55));

    for (let i = 0; i < actions.length; ++i) {
        const action = actions[i];
        testInverse(t, store, M, action, JSON.stringify(action));
    }

    const inverses:any[] = [];
    for (let i = 0; i < actions.length; ++i) {
        const action = actions[i];
        inverses.push(store.inverse(M, action));
        store.apply(M, actions[i]);
    }
    while (inverses.length > 0) {
        store.apply(M, inverses.pop());
    }
    t.deepEqual(store.state(M, {}), {foo: 11.11, bar: 22.22, baz: 33.33});
    t.end();
});

test('map of structs', (t) => {
    const M = new MuRDAMap(new MuASCII(), new MuRDAStruct({
        r: new MuRDARegister(new MuFloat64()),
        s: new MuRDAStruct({
            r: new MuRDARegister(new MuUTF8()),
        }),
    }));
    const store = M.createStore({
        foo: {r: 11.11, s: {r: '11.11'}},
        bar: {r: 22.11, s: {r: '22.11'}},
        baz: {r: 33.11, s: {r: '33.11'}},
    });
    const dispatchers = M.action(store);

    const actions:any[] = [];
    actions.push(dispatchers.update('foo').r(11.22));
    actions.push(dispatchers.update('foo').s.r('11.22'));
    actions.push(dispatchers.clear());
    actions.push(dispatchers.reset({
        foo: {r: 11.22, s: {r: '11.22'}},
        bar: {r: 22.11, s: {r: '22.11'}},
    }));
    actions.push(dispatchers.set('foo', {r: 11.33, s: {r: '11.33'}}));
    actions.push(dispatchers.remove('foo'));
    actions.push(dispatchers.move('bar', 'baz'));
    actions.push(dispatchers.move('baz', 'qux'));
    actions.push(dispatchers.set('qux', {r: 44.11, s: {r: '44.11'}}));
    actions.push(dispatchers.set('quux', {r: 55.11, s: {r: '55.11'}}));

    for (let i = 0; i < actions.length; ++i) {
        const action = actions[i];
        testInverse(t, store, M, action, JSON.stringify(action));
    }

    const inverses:any[] = [];
    for (let i = 0; i < actions.length; ++i) {
        const action = actions[i];
        inverses.push(store.inverse(M, action));
        store.apply(M, action);
    }
    while (inverses.length > 0) {
        store.apply(M, inverses.pop());
    }
    t.deepEqual(store.state(M, {}), {
        foo: {r: 11.11, s: {r: '11.11'}},
        bar: {r: 22.11, s: {r: '22.11'}},
        baz: {r: 33.11, s: {r: '33.11'}},
    });
    t.end();
});

test('map of maps', (t) => {
    const M = new MuRDAMap(new MuASCII(), new MuRDAMap(
        new MuASCII(),
        new MuRDAConstant(new MuFloat64()),
    ));
    const store = M.createStore({foo: {bar: 11.11, baz: 22.22, qux: 33.33}});
    const dispatchers = M.action(store);

    const actions:any[] = [];
    actions.push(dispatchers.update('foo').clear());
    actions.push(dispatchers.update('foo').reset({bar: 22.11, baz: 22.22}));
    actions.push(dispatchers.update('foo').set('bar', 33.33));
    actions.push(dispatchers.update('foo').remove('bar'));
    actions.push(dispatchers.update('foo').move('baz', 'qux'));
    actions.push(dispatchers.update('foo').move('qux', 'quux'));
    actions.push(dispatchers.update('foo').set('quux', 44.44));
    actions.push(dispatchers.update('foo').set('quuz', 55.55));

    for (let i = 0; i < actions.length; ++i) {
        const action = actions[i];
        testInverse(t, store, M, action, JSON.stringify(action));
    }

    const inverses:any[] = [];
    for (let i = 0; i < actions.length; ++i) {
        const action = actions[i];
        inverses.push(store.inverse(M, action));
        store.apply(M, action);
    }
    while (inverses.length > 0) {
        store.apply(M, inverses.pop());
    }
    t.deepEqual(store.state(M, {}), {foo: {bar: 11.11, baz: 22.22, qux: 33.33}});
    t.end();
});

test('map of structs of maps of structs', (t) => {
    const M = new MuRDAMap(new MuASCII(), new MuRDAStruct({
        m: new MuRDAMap(new MuASCII(), new MuRDAStruct({
            k: new MuRDARegister(new MuASCII()),
            v: new MuRDARegister(new MuFloat64()),
        })),
    }));
    const store = M.createStore({
        foo: {m: {
            foo: {k: 'foo', v: 11.11},
            bar: {k: 'bar', v: 22.22},
            baz: {k: 'baz', v: 33.33},
        }},
    });
    const dispatchers = M.action(store);

    const actions:any[] = [];
    actions.push(dispatchers.update('foo').m.update('foo').k('f'));
    actions.push(dispatchers.update('foo').m.update('foo').v(1.1));
    actions.push(dispatchers.update('foo').m.clear());
    actions.push(dispatchers.update('foo').m.reset({
        foo: {k: 'foo', v: 22.22},
        bar: {k: 'bar', v: 22.22},
    }));
    actions.push(dispatchers.update('foo').m.set('foo', {k: 'f', v: 1.1}));
    actions.push(dispatchers.update('foo').m.remove('foo'));
    actions.push(dispatchers.update('foo').m.move('bar', 'baz'));
    actions.push(dispatchers.update('foo').m.move('baz', 'qux'));
    actions.push(dispatchers.update('foo').m.set('qux', {k: 'qux', v: 33.33}));
    actions.push(dispatchers.update('foo').m.set('quux', {k: 'quux', v: 44.44}));

    for (let i = 0; i < actions.length; ++i) {
        const action = actions[i];
        testInverse(t, store, M, action, JSON.stringify(action));
    }

    const inverses:any[] = [];
    for (let i = 0; i < actions.length; ++i) {
        const action = actions[i];
        inverses.push(store.inverse(M, action));
        store.apply(M, action);
    }
    while (inverses.length > 0) {
        store.apply(M, inverses.pop());
    }
    t.deepEqual(store.state(M, {}), {
        foo: {m: {
            foo: {k: 'foo', v: 11.11},
            bar: {k: 'bar', v: 22.22},
            baz: {k: 'baz', v: 33.33},
        }},
    });
    t.end();
});

test('inverse - list', (t) => {
    const L = new MuRDAList(new MuRDARegister(new MuFloat64()));
    const store = L.createStore([1.11, 2.22, 3.33, 4.44, 5.55]);
    const dispatchers = L.action(store);

    const actions:any[] = [];
    actions.push(dispatchers.splice(1, 2));
    actions.push(dispatchers.shift());
    actions.push(dispatchers.pop());
    actions.push(dispatchers.unshift(1.11, 2.22));
    actions.push(dispatchers.push(5.55, 6.66));
    actions.push(dispatchers.splice(2, 0, 3.33));
    actions.push(dispatchers.reset([11.1, 22.2, 33.3]));
    actions.push(dispatchers.clear());

    testInverse(t, store, L, actions[0], 'remove');
    testInverse(t, store, L, actions[1], 'shift');
    testInverse(t, store, L, actions[2], 'pop');
    testInverse(t, store, L, actions[3], 'unshift');
    testInverse(t, store, L, actions[4], 'push');
    testInverse(t, store, L, actions[5], 'insert');
    testInverse(t, store, L, actions[6], 'reset');
    testInverse(t, store, L, actions[7], 'clear');

    const inverses:any[] = [];
    for (let i = 0; i < actions.length; ++i) {
        inverses.push(store.inverse(L, actions[i]));
    }
    testInverse(t, store, L, inverses[0], 'remove inverse');
    testInverse(t, store, L, inverses[1], 'shift inverse');
    testInverse(t, store, L, inverses[2], 'pop inverse');
    testInverse(t, store, L, inverses[3], 'unshift inverse');
    testInverse(t, store, L, inverses[4], 'push inverse');
    testInverse(t, store, L, inverses[5], 'insert inverse');
    testInverse(t, store, L, inverses[6], 'reset inverse');
    testInverse(t, store, L, inverses[7], 'clear inverse');

    for (let i = 0; i < actions.length; ++i) {
        store.apply(L, actions[i]);
    }
    for (let i = 0; i < inverses.length; ++i) {
        store.apply(L, inverses[i]);
    }
    t.deepEqual(store.state(L, []), [1.11, 2.22, 3.33, 4.44, 5.55]);
    t.end();
});

test('inverse - list of lists', (t) => {
    const L = new MuRDAList(new MuRDAList(new MuRDARegister(new MuFloat64())));
    const store = L.createStore([[1.11, 2.22, 3.33, 4.44, 5.55]]);
    const dispatchers = L.action(store);

    L.actionMeta.action.table.update;

    const actions:any[] = [];
    actions.push(dispatchers.update(0).splice(1, 2));
    actions.push(dispatchers.update(0).shift());
    actions.push(dispatchers.update(0).pop());
    actions.push(dispatchers.update(0).unshift(1.11, 2.22));
    actions.push(dispatchers.update(0).push(5.55, 6.66));
    actions.push(dispatchers.update(0).splice(2, 0, 3.33));
    actions.push(dispatchers.update(0).reset([11.1, 22.2, 33.3]));
    actions.push(dispatchers.update(0).clear());

    const inverses:any[] = [];
    for (let i = 0; i < actions.length; ++i) {
        const action = actions[i];
        const inverse = store.inverse(L, action);
        testInverse(t, store, L, action, JSON.stringify(action));
        testInverse(t, store, L, inverse, JSON.stringify(inverse));
        inverses.push(inverse);
    }
    t.end();
});

test('inverse - list of structs', (t) => {
    const L = new MuRDAList(new MuRDAStruct({
        f: new MuRDARegister(new MuFloat64()),
        u: new MuRDARegister(new MuUTF8()),
        s: new MuRDAStruct({
            x: new MuRDARegister(new MuFloat64()),
        }),
    }));
    const store = L.createStore([L.valueRDA.stateSchema.identity]);
    const dispatchers = L.action(store);

    const actions:any[] = [];
    actions.push(dispatchers.update(0).f(1));
    actions.push(dispatchers.update(0).u('Iñtërnâtiônàlizætiøn☃💩'));
    actions.push(dispatchers.update(0).s.x(0.5));

    const inverses:any[] = [];
    for (let i = 0; i < actions.length; ++i) {
        const action = actions[i];
        const inverse = store.inverse(L, actions[i]);
        testInverse(t, store, L, action, JSON.stringify(action));
        testInverse(t, store, L, inverse, JSON.stringify(inverse));
        inverses.push(store.inverse(L, actions[i]));
    }

    for (let i = 0; i < actions.length; ++i) {
        store.apply(L, actions[i]);
    }
    for (let i = 0; i < inverses.length; ++i) {
        store.apply(L, inverses[i]);
    }
    t.deepEqual(store.state(L, []), [L.valueRDA.stateSchema.identity]);
    t.end();
});
