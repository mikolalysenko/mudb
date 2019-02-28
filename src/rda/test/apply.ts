import test = require('tape');

import { MuFloat64, MuUint8, MuStruct, MuUint32, MuUTF8, MuASCII, MuInt8 } from '../../schema';
import { MuRDAConstant, MuRDARegister, MuRDAStruct, MuRDAMap, MuRDAList } from '../index';

test('constant apply', (t) => {
    const store = new MuRDAConstant(new MuFloat64()).createStore(0);
    t.false(store.apply(), 'always false');
    t.end();
});

test('register apply', (t) => {
    const Durability = new MuRDARegister(new MuFloat64());
    const durabilityStore = Durability.createStore(100);
    t.true(durabilityStore.apply(Durability, 99.97), 'decrease durability');
    t.equal(durabilityStore.state(Durability, 100), 99.97, 'new durability');

    const User = new MuRDARegister(new MuStruct({
        id: new MuUint32(),
        name: new MuUTF8(),
    }));
    const userStore = User.createStore(User.stateSchema.alloc());
    const u = {id: 12345, name: 'Mikola'};
    t.true(userStore.apply(User, u), 'initiate user');
    t.deepEqual(userStore.state(User, User.stateSchema.alloc()), u, 'user info');
    t.isNot(userStore.state(User, User.stateSchema.alloc()), u, 'should be a copy');
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
    actions.push(dispatcher.rs({f: 22.22, u: 'a'}));
    actions.push(dispatcher.s.rf(33.33));
    actions.push(dispatcher.s.rs({f: 44.44, u: 'b'}));
    actions.push(dispatcher.s.s.rf(55.55));
    actions.push(dispatcher.s.s.rs({f: 66.66, u: 'Iñtërnâtiônàlizætiøn☃💩'}));

    for (let i = 0; i < actions.length; ++i) {
       t.true(store.apply(S, actions[i]), JSON.stringify(actions[i]));
    }
    t.deepEqual(
        store.state(S, S.stateSchema.alloc()),
        {
            c: 0,
            rf: 11.11,
            rs: {f: 22.22, u: 'a'},
            s: {
                rf: 33.33,
                rs: {f: 44.44, u: 'b'},
                s: {
                    rf: 55.55,
                    rs: {f: 66.66, u: 'Iñtërnâtiônàlizætiøn☃💩'},
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
    let action;

    function checkState (expected) {
        t.deepEqual(store.state(M, M.stateSchema.alloc()), expected, JSON.stringify(action));
    }

    const e = Math.E;
    const pi = Math.PI;
    const log2e = Math.LOG2E;
    const log10e = Math.LOG10E;

    t.true(store.apply(M, action = dispatchers.clear()), 'clear when empty');
    checkState({});
    t.true(store.apply(M, action = dispatchers.set('--non-existent', Infinity)), 'set entry');
    checkState({'--non-existent': Infinity});
    t.true(store.apply(M, action = dispatchers.set('--non-existent', -Infinity)), 'set existent entry');
    checkState({'--non-existent': -Infinity});
    t.true(store.apply(M, action = dispatchers.remove('--non-existent')), 'remove entry');
    checkState({});
    t.false(store.apply(M, action = dispatchers.remove('--non-existent')), 'remove non-existent entry');
    checkState({});
    t.true(store.apply(M, action = dispatchers.set('e', e)), 'set e');
    checkState({e});
    t.true(store.apply(M, action = dispatchers.set('pi', pi)), 'set pi');
    checkState({e, pi});
    t.true(store.apply(M, action = <any>{type: 'noop', data: 'whatever'}), 'noop');
    checkState({e, pi});
    t.true(store.apply(M, action = dispatchers.reset({log2e, log10e})), 'reset');
    checkState({log2e, log10e});
    t.true(store.apply(M, action = dispatchers.clear()), 'clear');
    checkState({});
    t.true(store.apply(M, action = dispatchers.set('Iñtërnâtiônàlizætiøn☃💩', 0)), 'key with emoji');
    checkState({'Iñtërnâtiônàlizætiøn☃💩': 0});
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
    let action;

    function checkState (expected) {
        t.deepEqual(store.state(M, M.stateSchema.alloc()), expected, JSON.stringify(action));
    }

    t.true(store.apply(M, action = dispatchers.set('first', {r: 11.11, s: {r: '11.22'}})), 'set entry');
    checkState({first: {r: 11.11, s: {r: '11.22'}}});
    t.true(store.apply(M, action = dispatchers.set('second', M.valueRDA.stateSchema.alloc())), 'set another');
    checkState({first: {r: 11.11, s: {r: '11.22'}}, second: {r: 0, s: {r: ''}}});
    t.true(store.apply(M, action = dispatchers.update('second').r(22.11)), 'set inner entry');
    checkState({first: {r: 11.11, s: {r: '11.22'}}, second: {r: 22.11, s: {r: ''}}});
    t.true(store.apply(M, action = dispatchers.update('second').s.r('22.22')), 'set innermost entry');
    checkState({first: {r: 11.11, s: {r: '11.22'}}, second: {r: 22.11, s: {r: '22.22'}}});
    t.true(store.apply(M, action = dispatchers.update('vanished').s.r('22.22')), 'update non-existent entry');
    checkState({first: {r: 11.11, s: {r: '11.22'}}, second: {r: 22.11, s: {r: '22.22'}}});
    t.false(store.apply(M, action = <any>{type: 'update', data: {id: 'imaginary', action: {type: 'r', data: 0}}}), 'update non-existent entry');
    checkState({first: {r: 11.11, s: {r: '11.22'}}, second: {r: 22.11, s: {r: '22.22'}}});

    const defaultMap = {
        x: {r: 0, s: {r: ''}},
        y: {r: 0, s: {r: ''}},
        z: {r: 0, s: {r: ''}},
    };
    t.true(store.apply(M, action = dispatchers.reset(defaultMap)), 'reset');
    checkState(defaultMap);

    t.true(store.apply(M, action = dispatchers.clear()), 'clear');
    checkState({});
    t.end();
});

test('map of maps apply', (t) => {
    const M = new MuRDAMap(
        new MuUTF8(),
        new MuRDAMap(new MuUTF8(), new MuRDARegister(new MuFloat64())),
    );
    const store = M.createStore(M.stateSchema.identity);
    const dispatchers = M.action(store);
    let action;

    function checkState (expected) {
        t.deepEqual(store.state(M, M.stateSchema.alloc()), expected, JSON.stringify(action));
    }

    const e = Math.E;
    const pi = Math.PI;
    const log2e = Math.LOG2E;
    const log10e = Math.LOG10E;

    t.true(store.apply(M, action = dispatchers.set('constants', {})), 'set outer entry');
    checkState({constants: {}});
    t.true(store.apply(M, action = dispatchers.update('constants').clear()), 'clear when empty');
    checkState({constants: {}});
    t.true(store.apply(M, action = dispatchers.update('constants').set('--non-existent', Infinity)), 'set entry');
    checkState({constants: {'--non-existent': Infinity}});
    t.true(store.apply(M, action = dispatchers.update('constants').set('--non-existent', -Infinity)), 'set entry again');
    checkState({constants: {'--non-existent': -Infinity}});
    t.true(store.apply(M, action = dispatchers.update('constants').remove('--non-existent')), 'remove entry');
    checkState({constants: {}});
    t.false(store.apply(M, action = dispatchers.update('constants').remove('--non-existent')), 'remove non-existent entry');
    checkState({constants: {}});
    t.true(store.apply(M, action = dispatchers.update('constants').set('e', e)), 'set e');
    checkState({constants: {e}});
    t.true(store.apply(M, action = dispatchers.update('constants').set('pi', pi)), 'set pi');
    checkState({constants: {e, pi}});
    t.true(store.apply(M, action = dispatchers.update('constants').reset({log2e, log10e})), 'reset');
    checkState({constants: {log2e, log10e}});
    t.true(store.apply(M, action = dispatchers.update('constants').clear()), 'clear');
    checkState({constants: {}});
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
    let action;

    function checkState (expected) {
        t.deepEqual(store.state(M, M.stateSchema.alloc()), expected, JSON.stringify(action));
    }

    t.true(store.apply(M, action = dispatchers.set('outer', M.valueRDA.stateSchema.alloc())));
    checkState({outer: {m: {}}});
    t.true(store.apply(M, action = dispatchers.update('outer').m.set('inner', M.valueRDA.rdas.m.valueRDA.stateSchema.alloc())));
    checkState({outer: {m: {inner: {rf: 0, ru: ''}}}});
    t.true(store.apply(M, action = dispatchers.update('outer').m.update('inner').rf(111.111)), 'update inner prop');
    checkState({outer: {m: {inner: {rf: 111.111, ru: ''}}}});
    t.true(store.apply(M, action = dispatchers.update('outer').m.update('inner').ru('111.222')), 'update another inner prop');
    checkState({outer: {m: {inner: {rf: 111.111, ru: '111.222'}}}});
    t.true(store.apply(M, action = dispatchers.update('outer').m.reset({inner: {rf: 222.111, ru: '222.222'}})), 'reset');
    checkState({outer: {m: {inner: {rf: 222.111, ru: '222.222'}}}});
    t.true(store.apply(M, action = dispatchers.update('outer').m.clear()), 'clear');
    checkState({outer: {m: {}}});
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
    t.true(store.apply(L, L.action(store).insert(0, [6])), 'check insert ok');
    checkState([6, 100, 2], 'insert ok');
    t.true(store.apply(L, L.action(store).insert(1, [7])), 'check insert ok');
    checkState([6, 7, 100, 2], 'insert ok');
    t.true(store.apply(L, L.action(store).insert(4, [8])), 'check insert ok');
    checkState([6, 7, 100, 2, 8], 'insert ok');
    t.true(store.apply(L, L.action(store).shift(2)), 'shift ok');
    checkState([100, 2, 8], 'shift ok');
    t.true(store.apply(L, L.action(store).unshift([99, 13])), 'apply unshift ok');
    checkState([99, 13, 100, 2, 8], 'unshift ok');
    t.true(store.apply(L, L.action(store).clear()), 'apply clear ok');
    checkState([], 'clear ok');
    t.true(store.apply(L, L.action(store).push([0, 1, 2, 3, 4, 5, 7, 8, 9, 10])), 'check push ok');
    checkState([0, 1, 2, 3, 4, 5, 7, 8, 9, 10], 'post push ok');
    t.true(store.apply(L, L.action(store).remove(1, 2)), 'check remove ok');
    checkState([0, 3, 4, 5, 7, 8, 9, 10], 'post remove ok');

    t.end();
});

test('nested list', (t) => {
    const L = new MuRDAList(new MuRDAList(new MuRDARegister(new MuFloat64())));

    const store = L.createStore([]);

    t.end();
});

test('list of nested structs', (t) => {
    const L = new MuRDAList(new MuRDAStruct({
        child: new MuRDAStruct({
            a: new MuRDARegister(new MuFloat64()),
        }),
        others: new MuRDAList(
            new MuRDAStruct({
                f: new MuRDAConstant(new MuUTF8()),
            })),
    }));

    // some crazy mess data structure

    t.end();
});
