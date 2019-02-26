import test = require('tape');

import { MuInt8, MuFloat64, MuASCII, MuStruct, MuUint32, MuUTF8 } from '../../schema';
import { MuRDA, MuRDAStore, MuRDATypes, MuRDAConstant, MuRDARegister, MuRDAStruct, MuRDAMap, MuRDAList } from '../index';

function testInverse<
    RDA extends MuRDA<any, any, any, any>,
    Store extends MuRDAStore<RDA>> (t, store:Store, rda:RDA, action:MuRDATypes<RDA>['action'], msg:string) {
    const origin = store.state(rda, rda.stateSchema.alloc());
    const inverse = store.inverse(rda, action);
    store.apply(rda, action);
    store.apply(rda, inverse);
    t.deepEqual(store.state(rda, rda.stateSchema.alloc()), origin, msg);
}

test('constant inverse', (t) => {
    const store = new MuRDAConstant(new MuInt8()).createStore(0);
    t.equal(store.inverse.toString(), 'function () { }', 'should be noop');
    t.end();
});

test('register inverse', (t) => {
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

test('struct inverse', (t) => {
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

test('map inverse', (t) => {
    const M = new MuRDAMap(
        new MuASCII(),
        new MuRDAConstant(new MuFloat64()),
    );

    const e = Math.E;
    const pi = Math.PI;
    const log2e = Math.LOG2E;
    const log10e = Math.LOG10E;

    const store = M.createStore({e, pi});
    const dispatchers = M.action(store);

    const actions:any[] = [];
    actions.push(dispatchers.clear());
    actions.push(dispatchers.remove('e'));
    actions.push(dispatchers.reset({}));
    actions.push(dispatchers.set('log2e', log2e));
    actions.push(dispatchers.set('log10e', log10e));

    const inverses:any[] = [];
    for (let i = 0; i < actions.length; ++i) {
        inverses.push(store.inverse(M, actions[i]));
    }

    testInverse(t, store, M, actions[0], 'clear');
    testInverse(t, store, M, actions[1], 'remove entry');
    testInverse(t, store, M, actions[2], 'reset');
    testInverse(t, store, M, actions[3], 'set log2e');
    testInverse(t, store, M, actions[4], 'set log10e');

    for (let i = 0; i < actions.length; ++i) {
        store.apply(M, actions[i]);
    }
    for (let i = 0; i < inverses.length; ++i) {
        store.apply(M, inverses[i]);
    }
    t.deepEqual(store.state(M, {}), {e, pi});
    t.end();
});

test('map of structs inverse', (t) => {
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

    t.deepEqual(inverses[0], {type: 'update', data: {id: 'first', action: {type: 'r', data: 11.11}}});
    t.deepEqual(inverses[1], {type: 'update', data: {id: 'first', action: {type: 's', data: {type: 'r', data: '11.11'}}}});
    t.deepEqual(inverses[2], {type: 'remove', data: 'second'});
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

test('map of maps inverse', (t) => {
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

test('map of structs of maps of structs', (t) => {
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

test('list', (t) => {

    // TODO test inverse of each action type

    t.end();
});
