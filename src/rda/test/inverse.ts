import test = require('tape');

import { MuInt8, MuFloat64, MuASCII, MuStruct, MuUint32, MuUTF8 } from '../../schema';
import { MuRDA, MuRDAStore, MuRDATypes } from '../index';
import { MuRDAConstant, MuRDARegister, MuRDAList, MuRDAMap, MuRDAStruct } from '../index';

function testInverse<
    RDA extends MuRDA<any, any, any, any>,
    Store extends MuRDAStore<RDA>> (t, store:Store, rda:RDA, action:MuRDATypes<RDA>['action'], msg:string) {
    const origin = store.state(rda, rda.stateSchema.alloc());
    const inverse = store.inverse(rda, action);
    store.apply(rda, action);
    store.apply(rda, inverse);
    t.deepEqual(store.state(rda, rda.stateSchema.alloc()), origin, msg);
}

test('inverse - constant', (t) => {
    const store = new MuRDAConstant(new MuInt8()).createStore(0);
    t.equal(store.inverse.toString(), 'function () { }', 'should be noop');
    t.end();
});

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

test('inverse - map', (t) => {
    const M = new MuRDAMap(
        new MuASCII(),
        new MuRDAConstant(new MuFloat64()),
    );

    const e = Math.E;
    const pi = Math.PI;
    const log2e = Math.LOG2E;
    const log10e = Math.LOG10E;

    const store = M.createStore({e, pi, foo: 1, bar: 2});
    const dispatchers = M.action(store);

    const actions:any[] = [];
    actions.push(dispatchers.move('e', 'e'));
    actions.push(dispatchers.move('pi', 'PI'));
    actions.push(dispatchers.move('foo', 'bar'));
    actions.push(dispatchers.clear());
    actions.push(dispatchers.remove('e'));
    actions.push(dispatchers.reset({}));
    actions.push(dispatchers.set('log2e', log2e));
    actions.push(dispatchers.set('log10e', log10e));

    const inverses:any[] = [];
    for (let i = 0; i < actions.length; ++i) {
        inverses.push(store.inverse(M, actions[i]));
        testInverse(t, store, M, actions[i], JSON.stringify(actions[i]));
    }

    for (let i = 0; i < actions.length; ++i) {
        store.apply(M, actions[i]);
    }
    for (let i = 0; i < inverses.length; ++i) {
        store.apply(M, inverses[i]);
    }
    t.deepEqual(store.state(M, {}), {e, pi, foo: 1, bar: 2});
    t.end();
});

test('inverse - map of structs', (t) => {
    const M = new MuRDAMap(new MuASCII(), new MuRDAStruct({
        r: new MuRDARegister(new MuFloat64()),
        s: new MuRDAStruct({
            r: new MuRDARegister(new MuUTF8()),
        }),
    }));
    const store = M.createStore({first: {r: 11.11, s: {r: '11.11'}}});
    const dispatchers = M.action(store);

    const actions:any[] = [];
    actions.push(dispatchers.update('first').r(11.22));
    actions.push(dispatchers.update('first').s.r('11.22'));
    actions.push(dispatchers.set('second', {r: 22.11, s: {r: '22.11'}}));

    const inverses:any[] = [];
    for (let i = 0; i < actions.length; ++i) {
        inverses.push(store.inverse(M, actions[i]));
    }

    testInverse(t, store, M, actions[0], 'update first.r');
    testInverse(t, store, M, actions[1], 'update first.s.r');
    testInverse(t, store, M, actions[2], 'set second');

    for (let i = 0; i < actions.length; ++i) {
        store.apply(M, actions[i]);
    }
    for (let i = 0; i < inverses.length; ++i) {
        store.apply(M, inverses[i]);
    }
    t.deepEqual(store.state(M, {}), {first: {r: 11.11, s: {r: '11.11'}}});
    t.end();
});

test('inverse - map of maps', (t) => {
    const M = new MuRDAMap(new MuASCII(), new MuRDAMap(
        new MuASCII(),
        new MuRDAConstant(new MuFloat64()),
    ));

    const e = Math.E;
    const pi = Math.PI;
    const ln2 = Math.LN2;
    const ln10 = Math.LN10;

    const store = M.createStore({constants: {e, pi}});
    const dispatchers = M.action(store);

    const actions:any[] = [];
    actions.push(dispatchers.update('constants').reset({ln2, ln10}));
    actions.push(dispatchers.update('constants').set('pi', pi));
    actions.push(dispatchers.update('constants').remove('pi'));
    actions.push(dispatchers.update('constants').clear());

    const inverses:any[] = [];
    for (let i = 0; i < actions.length; ++i) {
        inverses.push(store.inverse(M, actions[i]));
    }

    testInverse(t, store, M, actions[0], 'reset');
    testInverse(t, store, M, actions[1], 'set pi');
    testInverse(t, store, M, actions[2], 'remove pi');
    testInverse(t, store, M, actions[3], 'clear');

    for (let i = 0; i < actions.length; ++i) {
        store.apply(M, actions[i]);
    }
    for (let i = 0; i < inverses.length; ++i) {
        store.apply(M, inverses[i]);
    }
    t.deepEqual(store.state(M, {}), {constants: {e, pi}});
    t.end();
});

test('inverse - map of structs of map of structs', (t) => {
    const M = new MuRDAMap(new MuASCII(), new MuRDAStruct({
        constants: new MuRDAMap(new MuASCII(), new MuRDAStruct({
            name: new MuRDARegister(new MuASCII()),
            value: new MuRDARegister(new MuFloat64()),
        })),
    }));
    const store = M.createStore({
        math: {
            constants: {
                E: {name: '', value: 0}}}});
    const dispatchers = M.action(store);

    const e = Math.E;
    const pi = Math.PI;
    const ln2 = Math.LN2;
    const ln10 = Math.LN10;

    const actions:any[] = [];
    actions.push(dispatchers.update('math').constants.update('E').name('e'));
    actions.push(dispatchers.update('math').constants.update('E').value(e));
    actions.push(dispatchers.update('math').constants.set('PI', {name: 'pi', value: pi}));
    actions.push(dispatchers.update('math').constants.remove('E'));
    actions.push(dispatchers.update('math').constants.reset({
        LN2: {name: 'ln2', value: ln2},
        LN10: {name: 'ln10', value: ln10},
    }));
    actions.push(dispatchers.update('math').constants.clear());

    testInverse(t, store, M, actions[0], 'update E name');
    testInverse(t, store, M, actions[1], 'update E value');
    testInverse(t, store, M, actions[2], 'set PI');
    testInverse(t, store, M, actions[3], 'remove E');
    testInverse(t, store, M, actions[4], 'reset');
    testInverse(t, store, M, actions[5], 'clear');

    const inverses:any[] = [];
    for (let i = 0; i < actions.length; ++i) {
        inverses.push(store.inverse(M, actions[i]));
    }

    for (let i = 0; i < actions.length; ++i) {
        store.apply(M, actions[i]);
    }
    for (let i = 0; i < inverses.length; ++i) {
        store.apply(M, inverses[i]);
    }
    t.deepEqual(store.state(M, {}), {
        math: {
            constants: {
                E: {name: '', value: 0}}}});
    t.end();
});

test('inverse - list', (t) => {
    const L = new MuRDAList(new MuRDARegister(new MuFloat64()));
    const store = L.createStore([1.11, 2.22, 3.33, 4.44, 5.55]);
    const dispatchers = L.action(store);

    const actions:any[] = [];
    actions.push(dispatchers.remove(1, 2));
    actions.push(dispatchers.shift());
    actions.push(dispatchers.pop());
    actions.push(dispatchers.unshift([1.11, 2.22]));
    actions.push(dispatchers.push([5.55, 6.66]));
    actions.push(dispatchers.insert(2, [3.33]));
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

    const actions:any[] = [];
    actions.push(dispatchers.update(0).remove(1, 2));
    actions.push(dispatchers.update(0).shift());
    actions.push(dispatchers.update(0).pop());
    actions.push(dispatchers.update(0).unshift([1.11, 2.22]));
    actions.push(dispatchers.update(0).push([5.55, 6.66]));
    actions.push(dispatchers.update(0).insert(2, [3.33]));
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
