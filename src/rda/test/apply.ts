import test = require('tape');

import { MuFloat64, MuUint8, MuStruct, MuUint32, MuUTF8, MuASCII, MuInt8 } from '../../schema';
import { MuRDAConstant, MuRDARegister, MuRDAStruct, MuRDAMap, MuRDAList } from '../index';

test('constant apply', (t) => {
    const FloatConstStore = new MuRDAConstant(new MuFloat64()).createStore(0);
    t.false(FloatConstStore.apply(), 'should always be false');

    const InitStatsStore = new MuRDAConstant(new MuStruct({
        health: new MuUint8(),
        mana: new MuUint8(),
    })).createStore({
        health: 100,
        mana: 200,
    });
    t.false(InitStatsStore.apply(), 'should always be false');
    t.end();
});

test('register apply', (t) => {
    const FloatReg = new MuRDARegister(new MuFloat64());
    const FloatRegStore = FloatReg.createStore(0);
    t.true(FloatRegStore.apply(FloatReg, 123.123), 'should always be true');
    t.equal(FloatRegStore.value, 123.123, 'should set value');

    const UserReg = new MuRDARegister(new MuStruct({
        id: new MuUint32(),
        name: new MuUTF8(),
    }));
    const UserRegStore = UserReg.createStore({id: 0, name: ''});
    const u = {id: 12345, name: 'Mikola'};
    t.true(UserRegStore.apply(UserReg, u), 'should always be true');
    t.deepEqual(UserRegStore.value, u, 'should set value');
    t.isNot(UserRegStore.value, u, 'value should be a copy');
    t.end();
});

test('struct apply', (t) => {
    const S = new MuRDAStruct({
        c: new MuRDAConstant(new MuInt8()),
        rf: new MuRDARegister(new MuFloat64()),
        rs: new MuRDARegister(new MuStruct({
            f: new MuFloat64(), u: new MuUTF8(),
        })),
        s: new MuRDAStruct({
            rf: new MuRDARegister(new MuFloat64()),
            rs: new MuRDARegister(new MuStruct({
                f: new MuFloat64(),
                u: new MuUTF8(),
            })),
            s: new MuRDAStruct({
                rf: new MuRDARegister(new MuFloat64()),
                rs: new MuRDARegister(new MuStruct({
                    f: new MuFloat64(),
                    u: new MuUTF8(),
                })),
            }),
        }),
    });
    const store = S.createStore(S.stateSchema.identity);
    const dispatcher = S.action(store);

    const actions:any[] = [];
    actions.push(dispatcher.rf(11.11));
    actions.push(dispatcher.rs({f: 22.11, u: 'a'}));
    actions.push(dispatcher.s.rf(33.11));
    actions.push(dispatcher.s.rs({f: 44.11, u: 'b'}));
    actions.push(dispatcher.s.s.rf(55.11));
    actions.push(dispatcher.s.s.rs({f: 66.11, u: 'c'}));
    actions.push(dispatcher.s.s.rs({f: 66.22, u: 'Iñtërnâtiônàlizætiøn☃💩'}));
    actions.push(dispatcher.s.s.rf(55.22));
    actions.push(dispatcher.s.rs({f: 44.22, u: 'Iñtërnâtiônàlizætiøn☃💩'}));
    actions.push(dispatcher.s.rf(33.22));
    actions.push(dispatcher.rs({f: 22.22, u: 'Iñtërnâtiônàlizætiøn☃💩'}));
    actions.push(dispatcher.rf(11.22));

    for (let i = 0; i < actions.length; ++i) {
       t.true(store.apply(S, actions[i]));
    }
    t.deepEqual(
        store.state(S, S.stateSchema.alloc()),
        {
            c: 0,
            rf: 11.22,
            rs: {f: 22.22, u: 'Iñtërnâtiônàlizætiøn☃💩'},
            s: {
                rf: 33.22,
                rs: {f: 44.22, u: 'Iñtërnâtiônàlizætiøn☃💩'},
                s: {
                    rf: 55.22,
                    rs: {f: 66.22, u: 'Iñtërnâtiônàlizætiøn☃💩'},
                },
            },
        },
    );

    t.end();
});

test('map apply', (t) => {
    const M = new MuRDAMap(new MuUTF8(), new MuRDAConstant(new MuFloat64()));
    const store = M.createStore(M.stateSchema.identity);
    const dispatchers = M.action(store);

    const e = Math.E;
    const pi = Math.PI;
    const log2e = Math.LOG2E;
    const log10e = Math.LOG10E;

    t.true(store.apply(M, dispatchers.clear()), 'clean when empty');
    t.false(store.apply(M, dispatchers.remove('')), `remove entry ''`);
    t.false(store.apply(M, dispatchers.remove('--non-existent')), 'remove non-existent entry');
    t.true(store.apply(M, dispatchers.set('--non-existent', 0)), 'set entry');
    t.true(store.apply(M, dispatchers.set('--non-existent', 0)), 'set existent entry');
    t.true(store.apply(M, dispatchers.remove('--non-existent')), 'remove existent entry');
    t.true(store.apply(M, dispatchers.set('e', e)), 'set entry');
    t.true(store.apply(M, dispatchers.set('pi', pi)), 'set another');
    t.true(store.apply(M, {type: 'noop', data: 'whatever'}), 'noop');
    t.deepEqual(store.state(M, {}), {e, pi});
    t.true(store.apply(M, dispatchers.reset({log2e, log10e})), 'reset');
    t.deepEqual(store.state(M, {}), {log2e, log10e});
    t.true(store.apply(M, dispatchers.clear()), 'clear');
    t.deepEqual(store.state(M, {}), {});
    t.true(store.apply(M, dispatchers.set('Iñtërnâtiônàlizætiøn☃💩', 0)), 'key with emoji');
    t.deepEqual(store.state(M, {}), {'Iñtërnâtiônàlizætiøn☃💩': 0});
    t.end();
});

test('map of structs apply', (t) => {
    const M = new MuRDAMap(new MuUTF8(), new MuRDAStruct({
        r: new MuRDARegister(new MuFloat64()),
        s: new MuRDAStruct({
            r: new MuRDARegister(new MuUTF8()),
        }),
    }));
    const store = M.createStore(M.stateSchema.identity);
    const dispatchers = M.action(store);

    t.true(store.apply(M, dispatchers.set('first', {r: 11.11, s: {r: '11.22'}})), 'set entry');
    t.true(store.apply(M, dispatchers.update('first').r(11.11)), 'same value');
    t.true(store.apply(M, dispatchers.update('first').s.r('11.22')), 'same inner value');
    t.true(store.apply(M, dispatchers.update('first').r(111.111)), 'different value');
    t.true(store.apply(M, dispatchers.update('first').s.r('111.222')), 'different inner value');
    t.true(store.apply(M, dispatchers.update('vanished').s.r('22.22')), 'should be noop');
    t.true(store.apply(M, dispatchers.set('second', M.valueRDA.stateSchema.alloc())), 'set another');
    t.false(store.apply(M, {type: 'update', data: {id: 'imaginary', action: {type: 'r', data: 0}}}), 'update non-existent entry');
    t.deepEqual(store.state(M, {}), {
        first: {r: 111.111, s: {r: '111.222'}},
        second: {r: 0, s: {r: ''}},
    });

    const defaultMap = {
        x: {r: 0, s: {r: ''}},
        y: {r: 0, s: {r: ''}},
        z: {r: 0, s: {r: ''}},
    };
    t.true(store.apply(M, dispatchers.reset(defaultMap)), 'reset');
    t.deepEqual(store.state(M, {}), defaultMap);

    t.true(store.apply(M, dispatchers.clear()), 'clear');
    t.deepEqual(store.state(M, {}), {});
    t.end();
});

test('map of maps apply', (t) => {
    const M = new MuRDAMap(
        new MuUTF8(),
        new MuRDAMap(new MuUTF8(), new MuRDARegister(new MuFloat64())),
    );
    const store = M.createStore(M.stateSchema.identity);
    const dispatchers = M.action(store);

    const e = Math.E;
    const pi = Math.PI;
    const log2e = Math.LOG2E;
    const log10e = Math.LOG10E;

    t.true(store.apply(M, dispatchers.set('constants', {})), 'set outer entry');
    t.true(store.apply(M, dispatchers.update('constants').clear()), 'clear when empty');
    t.false(store.apply(M, dispatchers.update('constants').remove('')), `remove entry ''`);
    t.false(store.apply(M, dispatchers.update('constants').remove('--non-existent')), 'remove non-existent entry');
    t.true(store.apply(M, dispatchers.update('constants').set('--non-existent', 0)), 'set entry');
    t.true(store.apply(M, dispatchers.update('constants').set('--non-existent', 0)), 'set existent entry');
    t.true(store.apply(M, dispatchers.update('constants').remove('--non-existent')), 'remove existent entry');
    t.true(store.apply(M, dispatchers.update('constants').set('e', e)), 'set entry');
    t.true(store.apply(M, dispatchers.update('constants').set('pi', pi)), 'set another');
    t.deepEqual(store.state(M, {}), {constants: {e, pi}});
    t.true(store.apply(M, dispatchers.update('constants').reset({log2e, log10e})), 'reset');
    t.deepEqual(store.state(M, {}), {constants: {log2e, log10e}}, 'after reset');
    t.true(store.apply(M, dispatchers.update('constants').clear()), 'clear');
    t.deepEqual(store.state(M, {}), {constants: {}});
    t.true(store.apply(M, dispatchers.clear()), 'outer clear');
    t.deepEqual(store.state(M, {}), {});
    t.end();
});

test('map of structs of maps of structs apply', (t) => {
    const M = new MuRDAMap(new MuUTF8(), new MuRDAStruct({
        m: new MuRDAMap(new MuUTF8(), new MuRDAStruct({
            rf: new MuRDARegister(new MuFloat64()),
            ru: new MuRDARegister(new MuUTF8()),
        })),
    }));
    const store = M.createStore(M.stateSchema.identity);
    const dispatchers = M.action(store);

    t.true(store.apply(M, dispatchers.set('outer', M.valueRDA.stateSchema.alloc())));
    t.true(store.apply(M, dispatchers.update('outer').m.clear()), 'clear when empty');
    t.false(store.apply(M, dispatchers.update('outer').m.remove('')), `remove entry ''`);
    t.false(store.apply(M, dispatchers.update('outer').m.remove('--non-existent')), 'remove non-existent entry');
    t.true(store.apply(M, dispatchers.update('outer').m.set('--non-existent', M.valueRDA.rdas.m.valueRDA.stateSchema.alloc())), 'set entry');
    t.true(store.apply(M, dispatchers.update('outer').m.set('--non-existent', M.valueRDA.rdas.m.valueRDA.stateSchema.alloc())), 'set entry again');
    t.true(store.apply(M, dispatchers.update('outer').m.remove('--non-existent')), 'remove existent entry');
    t.true(store.apply(M, dispatchers.update('outer').m.set('inner', M.valueRDA.rdas.m.valueRDA.stateSchema.alloc())));
    t.true(store.apply(M, dispatchers.update('outer').m.update('inner').rf(111.111)), 'update inner prop');
    t.true(store.apply(M, dispatchers.update('outer').m.update('inner').ru('111.222')), 'update another inner prop');
    t.deepEqual(store.state(M, {}), {outer: {m: {inner: {rf: 111.111, ru: '111.222'}}}});
    t.true(store.apply(M, dispatchers.update('outer').m.reset({inner: {rf: 222.111, ru: '222.222'}})), 'reset');
    t.deepEqual(store.state(M, {}), {outer: {m: {inner: {rf: 222.111, ru: '222.222'}}}});
    t.true(store.apply(M, dispatchers.update('outer').m.clear()), 'clear');
    t.deepEqual(store.state(M, {}), {outer: {m: {}}});
    t.true(store.apply(M, dispatchers.clear()), 'outer clear');
    t.deepEqual(store.state(M, {}), {});
    t.end();
});

test('list apply', (t) => {
    const L = new MuRDAList(new MuRDARegister(new MuFloat64()));

    const store = L.createStore([]);

    function checkState (expected:number[], msg:string) {
        t.same(store.state(L, L.stateSchema.alloc()), expected, msg);
    }

    t.true(store.apply(L, L.action(store).push([1, 2, 3])), 'check push ok');
    checkState([1, 2, 3], 'post push ok');
    t.true(store.apply(L, L.action(store).pop(1)), 'check pop ok');
    checkState([1, 2], 'post pop ok');
    t.true(store.apply(L, L.action(store).update(0)(100)), 'check update ok');
    checkState([100, 2], 'update ok');

    t.end();
});

test('nested list', (t) => {
    t.end();
});

test('list of nested structs', (t) => {
    t.end();
});