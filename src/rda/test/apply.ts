import tape = require('tape');

import { MuFloat64, MuStruct, MuUint32, MuUTF8, MuInt8, MuASCII, MuVarint, MuBoolean, MuDate } from '../../schema';
import { MuRDA, MuRDAStore, MuRDAConstant, MuRDARegister, MuRDAList, MuRDAMap, MuRDAStruct } from '../index';

tape('constant', (t) => {
    const store = new MuRDAConstant(new MuFloat64()).createStore(0);
    t.false(store.apply(), 'always false');
    t.end();
});

tape('register', (t) => {
    const Durability = new MuRDARegister(new MuFloat64());
    const durabilityStore = Durability.createStore(100);
    t.true(durabilityStore.apply(Durability, 99.97), 'reduce durability');
    t.equal(durabilityStore.state(Durability, 100), 99.97, 'get new durability');

    const User = new MuRDARegister(new MuStruct({
        id: new MuUint32(),
        name: new MuUTF8(),
    }));
    const userStore = User.createStore(User.stateSchema.alloc());
    const u = {id: 12345, name: 'Mikola'};
    t.true(userStore.apply(User, u), 'initiate user');
    t.deepEqual(userStore.state(User, User.stateSchema.alloc()), u, 'get user info');
    t.isNot(userStore.state(User, User.stateSchema.alloc()), u, 'should be a copy');
    t.end();
});

tape('constrain', (t) => {
    const R = new MuRDARegister(new MuFloat64(), (x) => Math.max(0, Math.min(1, +x || 0)));
    const store = R.createStore(0);
    store.apply(R, 0.1);
    t.equal(store.state(R, 0), 0.1);
    store.apply(R, -0.1);
    t.equal(store.state(R, 0), 0);
    store.apply(R, 1.1);
    t.equal(store.state(R, 0), 1);
    store.apply(R, NaN);
    t.equal(store.state(R, 0), 0);
    t.end();
});

tape('list', (t) => {
    const L = new MuRDAList(new MuRDARegister(new MuInt8()));
    const store = L.createStore([]);
    const dispatchers = L.action(store);
    let action;

    function checkState (expected:number[]) {
        t.deepEqual(store.state(L, L.stateSchema.alloc()), expected, JSON.stringify(action));
    }

    t.true(store.apply(L, action = dispatchers.push(1, 2, 3, 4, 5)), 'push');
    checkState([1, 2, 3, 4, 5]);
    t.true(store.apply(L, action = dispatchers.pop()), 'pop 1');
    checkState([1, 2, 3, 4]);
    t.true(store.apply(L, action = dispatchers.pop(2)), 'pop 2');
    checkState([1, 2]);
    t.true(store.apply(L, action = dispatchers.pop(3)), 'pop 3');
    checkState([]);
    t.true(store.apply(L, action = dispatchers.unshift(1, 3, 5)), 'unshift');
    checkState([1, 3, 5]);
    t.throws(() => store.apply(L, action = dispatchers.update(3)(6)), TypeError, 'update [3]');
    t.true(store.apply(L, action = dispatchers.update(2)(6)), 'update [2]');
    checkState([1, 3, 6]);
    t.true(store.apply(L, action = dispatchers.splice(0, 0, 0)), 'insert at [0]');
    checkState([0, 1, 3, 6]);
    t.true(store.apply(L, action = dispatchers.splice(2, 0, 2)), 'insert at [2]');
    checkState([0, 1, 2, 3, 6]);
    t.true(store.apply(L, action = dispatchers.splice(4, 0, 4, 5)), 'insert at [4]');
    checkState([0, 1, 2, 3, 4, 5, 6]);
    t.true(store.apply(L, action = dispatchers.splice(7, 1)), 'remove [7]');
    checkState([0, 1, 2, 3, 4, 5, 6]);
    t.true(store.apply(L, action = dispatchers.splice(2, 2)), 'remove [2]');
    checkState([0, 1, 4, 5, 6]);
    t.true(store.apply(L, action = dispatchers.shift()), 'shift 1');
    checkState([1, 4, 5, 6]);
    t.true(store.apply(L, action = dispatchers.shift(2)), 'shift 2');
    checkState([5, 6]);
    t.true(store.apply(L, action = dispatchers.shift(3)), 'shift 3');
    checkState([]);
    t.true(store.apply(L, action = dispatchers.splice(0, 0, 7, 7, 7)), 'insert at [7]');
    checkState([7, 7, 7]);
    t.true(store.apply(L, action = dispatchers.clear()), 'clear');
    checkState([]);
    t.true(store.apply(L, action = dispatchers.splice(1, 0, 7, 7, 7)), 'insert at [7]');
    checkState([7, 7, 7]);
    t.true(store.apply(L, action = dispatchers.reset([1, 2, 3])), 'reset');
    checkState([1, 2, 3]);
    t.true(store.apply(L, action = dispatchers.reset([4, 5, 6])), 'reset again');
    checkState([4, 5, 6]);
    t.true(store.apply(L, action = dispatchers.clear()), 'clear');
    checkState([]);
    t.end();
});

tape('list of lists', (t) => {
    const L = new MuRDAList(new MuRDAList(new MuRDARegister(new MuFloat64())));
    const store = L.createStore([]);
    const dispatchers = L.action(store);
    let action;

    function checkState (expected) {
        t.deepEqual(store.state(L, L.stateSchema.alloc()), expected, JSON.stringify(action));
    }

    t.deepEqual(action = dispatchers.update(0), {}, 'update before push');
    checkState([]);
    t.true(store.apply(L, action = dispatchers.push([0], [], [1, 2], [3, 4, 5])), 'outer push');
    checkState([[0], [], [1, 2], [3, 4, 5]]);
    t.true(store.apply(L, action = dispatchers.pop(2)), 'outer pop');
    checkState([[0], []]);
    t.true(store.apply(L, action = dispatchers.update(1).pop()), 'pop when empty');
    checkState([[0], []]);
    t.true(store.apply(L, action = dispatchers.update(1).shift(2)), 'shift when empty');
    checkState([[0], []]);
    t.true(store.apply(L, action = dispatchers.update(1).push(0, 1, 2, 3, 4, 5, 6)), 'push when empty');
    checkState([[0], [0, 1, 2, 3, 4, 5, 6]]);
    t.true(store.apply(L, action = dispatchers.update(1).pop()), 'pop');
    checkState([[0], [0, 1, 2, 3, 4, 5]]);
    t.true(store.apply(L, action = dispatchers.update(1).pop(2)), 'pop 2');
    checkState([[0], [0, 1, 2, 3]]);
    t.true(store.apply(L, action = dispatchers.update(1).shift()), 'shift');
    checkState([[0], [1, 2, 3]]);
    t.true(store.apply(L, action = dispatchers.update(1).shift(3)), 'shift 3');
    checkState([[0], []]);
    t.true(store.apply(L, action = dispatchers.update(1).unshift(0, 1, 2)), 'unshift when empty');
    checkState([[0], [0, 1, 2]]);
    t.true(store.apply(L, action = dispatchers.update(1).splice(1, 0, 1, 2)), 'insert');
    checkState([[0], [0, 1, 2, 1, 2]]);
    t.true(store.apply(L, action = dispatchers.update(1).splice(3, 0, 1, 2)), 'insert');
    checkState([[0], [0, 1, 2, 1, 2, 1, 2]]);
    t.true(store.apply(L, action = dispatchers.update(1).splice(2, 4)), 'remove');
    checkState([[0], [0, 1, 2]]);
    t.true(store.apply(L, action = dispatchers.update(1).push(3, 4, 5)), 'push');
    checkState([[0], [0, 1, 2, 3, 4, 5]]);
    t.true(store.apply(L, action = dispatchers.update(1).unshift(3, 4, 5)), 'unshift');
    checkState([[0], [3, 4, 5, 0, 1, 2, 3, 4, 5]]);
    t.true(store.apply(L, action = dispatchers.update(1).clear()), 'clear');
    checkState([[0], []]);
    t.true(store.apply(L, action = dispatchers.update(1).reset([0, 1, 2, 6, 4, 5])), 'reset');
    checkState([[0], [0, 1, 2, 6, 4, 5]]);
    t.true(store.apply(L, action = dispatchers.update(1).update(3)(3)), 'update');
    checkState([[0], [0, 1, 2, 3, 4, 5]]);
    t.end();
});

tape('list of structs of list of structs', (t) => {
    const L = new MuRDAList(new MuRDAStruct({
        s: new MuRDAStruct({
            f: new MuRDARegister(new MuFloat64()),
        }),
        l: new MuRDAList(
            new MuRDAStruct({
                u: new MuRDARegister(new MuUTF8()),
            }),
        ),
    }));
    const store = L.createStore([]);
    const dispatchers = L.action(store);
    let action;

    function checkState (expected) {
        t.deepEqual(store.state(L, L.stateSchema.alloc()), expected, JSON.stringify(action));
    }

    t.deepEqual(action = dispatchers.update(0), {}, 'update before push');
    checkState([]);
    t.true(store.apply(L, action = dispatchers.pop()), 'outer pop when empty');
    checkState([]);
    t.true(store.apply(L, action = dispatchers.shift()), 'outer shift when empty');
    checkState([]);
    t.true(store.apply(L, action = dispatchers.push({s: {f: 11.11}, l: []}, {s: {f: 22.11}, l: [{u: '22.11'}]})), 'outer push');
    checkState([{s: {f: 11.11}, l: []}, {s: {f: 22.11}, l: [{u: '22.11'}]}]);
    t.true(store.apply(L, action = dispatchers.update(0).s.f(11.22)), 'update [0].s.f');
    checkState([{s: {f: 11.22}, l: []}, {s: {f: 22.11}, l: [{u: '22.11'}]}]);
    t.true(store.apply(L, action = dispatchers.update(1).s.f(22.22)), 'update [1].s.f');
    checkState([{s: {f: 11.22}, l: []}, {s: {f: 22.22}, l: [{u: '22.11'}]}]);
    t.true(store.apply(L, action = dispatchers.update(1).l.update(0).u('22.22')), 'update [1].l[0].u');
    checkState([{s: {f: 11.22}, l: []}, {s: {f: 22.22}, l: [{u: '22.22'}]}]);
    t.true(store.apply(L, action = dispatchers.pop()), 'outer pop');
    checkState([{s: {f: 11.22}, l: []}]);
    t.true(store.apply(L, action = dispatchers.update(0).l.pop()), 'pop when empty');
    checkState([{s: {f: 11.22}, l: []}]);
    t.true(store.apply(L, action = dispatchers.update(0).l.shift()), 'shift when empty');
    checkState([{s: {f: 11.22}, l: []}]);
    t.true(store.apply(L, action = dispatchers.update(0).l.push({u: '11.11'}, {u: '11.22'}, {u: '11.33'})), 'push');
    checkState([{s: {f: 11.22}, l: [{u: '11.11'}, {u: '11.22'}, {u: '11.33'}]}]);
    t.true(store.apply(L, action = dispatchers.update(0).l.pop()), 'pop');
    checkState([{s: {f: 11.22}, l: [{u: '11.11'}, {u: '11.22'}]}]);
    t.true(store.apply(L, action = dispatchers.update(0).l.shift()), 'shift');
    checkState([{s: {f: 11.22}, l: [{u: '11.22'}]}]);
    t.true(store.apply(L, action = dispatchers.update(0).l.unshift({u: '11.00'}, {u: '11.11'})), 'unshift');
    checkState([{s: {f: 11.22}, l: [{u: '11.00'}, {u: '11.11'}, {u: '11.22'}]}]);
    t.true(store.apply(L, action = dispatchers.update(0).l.splice(1, 0, {u: '11.33'})), 'insert');
    checkState([{s: {f: 11.22}, l: [{u: '11.00'}, {u: '11.33'}, {u: '11.11'}, {u: '11.22'}]}]);
    t.true(store.apply(L, action = dispatchers.update(0).l.splice(1, 0, {u: '11.11'}, {u: '11.22'})), 'insert 2');
    checkState([{s: {f: 11.22}, l: [{u: '11.00'}, {u: '11.11'}, {u: '11.22'}, {u: '11.33'}, {u: '11.11'}, {u: '11.22'}]}]);
    t.true(store.apply(L, action = dispatchers.update(0).l.splice(1, 1)), 'remove');
    checkState([{s: {f: 11.22}, l: [{u: '11.00'}, {u: '11.22'}, {u: '11.33'}, {u: '11.11'}, {u: '11.22'}]}]);
    t.true(store.apply(L, action = dispatchers.update(0).l.splice(1, 2)), 'remove 2');
    checkState([{s: {f: 11.22}, l: [{u: '11.00'}, {u: '11.11'}, {u: '11.22'}]}]);
    t.true(store.apply(L, action = dispatchers.update(0).l.clear()), 'clear');
    checkState([{s: {f: 11.22}, l: []}]);
    t.true(store.apply(L, action = dispatchers.update(0).l.reset([{u: '11.33'}, {u: '11.44'}, {u: '11.55'}])), 'reset');
    checkState([{s: {f: 11.22}, l: [{u: '11.33'}, {u: '11.44'}, {u: '11.55'}]}]);
    t.end();
});

function createTestApply<T extends MuRDA<any, any, any, any>> (t:tape.Test, store:MuRDAStore<T>, rda:T) {
    return function (action:T['actionSchema']['identity'], expected:boolean) {
        t.equal(store.apply(rda, action), expected, JSON.stringify(action));
    };
}

function createTestState<T extends MuRDA<any, any, any, any>> (t:tape.Test, store:MuRDAStore<T>, rda:T) {
    return function (expected:T['stateSchema']['identity']) {
        t.deepEqual(store.state(rda, rda.stateSchema.alloc()), expected);
    };
}

tape('map of Date constants', (t) => {
    const M = new MuRDAMap(new MuVarint(), new MuRDAConstant(new MuDate()));
    const store = M.createStore(M.stateSchema.identity);
    const dispatchers = M.action(store);

    const testApply = createTestApply(t, store, M);
    const testState = createTestState(t, store, M);

    testApply(dispatchers.clear(), true);
    testState({});
    testApply(dispatchers.move(0, 1), true);
    testState({});
    testApply(dispatchers.remove(0), true);
    testState({});
    testApply(dispatchers.reset({}), true);
    testState({});

    testApply(dispatchers.set(0, new Date(0)), true);
    testState({0: new Date(0)});
    testApply(dispatchers.set(0, new Date(1)), true);
    testState({0: new Date(1)});
    testApply(dispatchers.move(0, 1), true);
    testState({1: new Date(1)});
    testApply(dispatchers.move(1, 1), true);
    testState({1: new Date(1)});
    testApply(dispatchers.set(2, new Date(2)), true);
    testState({1: new Date(1), 2: new Date(2)});
    testApply(dispatchers.move(2, 1), true);
    testState({1: new Date(2)});
    testApply(dispatchers.move(2, 0), true);
    testState({1: new Date(2)});
    testApply(dispatchers.remove(1), true);
    testState({});
    testApply(dispatchers.move(1, 0), true);
    testState({});

    testApply(dispatchers.reset({0: new Date(0), 1: new Date(1)}), true);
    testState({0: new Date(0), 1: new Date(1)});
    testApply(dispatchers.reset({2: new Date(2)}), true);
    testState({2: new Date(2)});
    testApply(dispatchers.clear(), true);
    testState({});

    testApply(dispatchers.reset({0: new Date(0)}), true);
    testState({0: new Date(0)});

    // contrived invalid actions
    let action:any = dispatchers.remove(0);
    action.data.id = -1;
    testApply(action, false);
    testState({0: new Date(0)});

    action = dispatchers.move(0, 1);
    action.data.id = -1;
    testApply(action, false);
    testState({0: new Date(0)});

    action = dispatchers.set(1, new Date(1));
    action.type = 'foo';
    testApply(action, false);
    testState({0: new Date(0)});

    t.end();
});

tape('map of maps of varint register', (t) => {
    const M = new MuRDAMap(
        new MuASCII(),
        new MuRDAMap(new MuASCII(), new MuRDARegister(new MuVarint())),
    );
    const store = M.createStore(M.stateSchema.identity);
    const dispatchers = M.action(store);

    const testApply = createTestApply(t, store, M);
    const testState = createTestState(t, store, M);

    testApply(dispatchers.update('a').clear(), true);
    testApply(dispatchers.update('a').set('a', 0), true);
    testApply(dispatchers.update('a').update('a')(1), true);
    testApply(dispatchers.update('a').move('a', 'b'), true);
    testApply(dispatchers.update('a').remove('b'), true);
    testApply(dispatchers.update('a').reset({'a': 0}), true);
    testState({});

    testApply(dispatchers.set('foo', {}), true);
    testState({foo: {}});
    testApply(dispatchers.update('foo').set('a', 0), true);
    testState({foo: {a: 0}});
    testApply(dispatchers.update('foo').set('a', 1), true);
    testState({foo: {a: 1}});
    testApply(dispatchers.update('foo').move('a', 'b'), true);
    testState({foo: {b: 1}});
    testApply(dispatchers.update('foo').move('b', 'b'), true);
    testState({foo: {b: 1}});
    testApply(dispatchers.update('foo').set('a', 0), true);
    testState({foo: {a: 0, b: 1}});
    testApply(dispatchers.update('foo').move('b', 'a'), true);
    testState({foo: {a: 1}});
    testApply(dispatchers.update('foo').move('b', 'c'), true);
    testState({foo: {a: 1}});
    testApply(dispatchers.update('foo').remove('a'), true);
    testState({foo: {}});
    testApply(dispatchers.update('foo').move('a', 'b'), true);
    testState({foo: {}});

    testApply(dispatchers.update('foo').reset({a: 0, b: 1}), true);
    testState({foo: {a: 0, b: 1}});
    testApply(dispatchers.update('foo').reset({c: 2}), true);
    testState({foo: {c: 2}});
    testApply(dispatchers.update('foo').update('c')(3), true);
    testState({foo: {c: 3}});
    testApply(dispatchers.update('foo').clear(), true);
    testState({foo: {}});
    testApply(dispatchers.clear(), true);
    testState({});
    t.end();
});

tape('map of structs', (t) => {
    const M = new MuRDAMap(new MuVarint(), new MuRDAStruct({
        bool: new MuRDARegister(new MuBoolean()),
        varint: new MuRDARegister(new MuVarint()),
        utf8: new MuRDARegister(new MuUTF8()),
        date: new MuRDAConstant(new MuDate()),
    }));
    const store = M.createStore(M.stateSchema.identity);
    const dispatchers = M.action(store);

    const testApply = createTestApply(t, store, M);
    const testState = createTestState(t, store, M);

    testApply(dispatchers.set(127, {bool: false, varint: 0, utf8: '', date: new Date(0)}), true);
    testState({127: { bool: false, varint: 0, utf8: '', date: new Date(0)}});
    testApply(dispatchers.move(127, 128), true);
    testState({128: {bool: false, varint: 0, utf8: '', date: new Date(0)}});
    testApply(dispatchers.update(127).bool(true), true);
    testState({128: {bool: false, varint: 0, utf8: '', date: new Date(0)}});
    testApply(dispatchers.update(128).utf8('Iñtërnâtiônàlizætiøn☃💩'), true);
    testState({128: {bool: false, varint: 0, utf8: 'Iñtërnâtiônàlizætiøn☃💩', date: new Date(0)}});
    t.end();
});

tape('map of structs of structs of structs', (t) => {
    const M = new MuRDAMap(new MuASCII(), new MuRDAStruct({
        s: new MuRDAStruct({
            b: new MuRDARegister(new MuBoolean()),
            s: new MuRDAStruct({
                v: new MuRDARegister(new MuVarint()),
            }),
        }),
    }));
    const store = M.createStore(M.stateSchema.identity);
    const dispatchers = M.action(store);

    const testApply = createTestApply(t, store, M);
    const testState = createTestState(t, store, M);

    testApply(dispatchers.set('foo', {
        s: {
            b: false,
            s: {
                v: 0,
            },
        },
    }), true);
    testState({
        'foo': {
            s: {
                b: false,
                s: {
                    v: 0,
                },
            },
        },
    });
    testApply(dispatchers.move('foo', 'bar'), true);
    testState({
        'bar': {
            s: {
                b: false,
                s: {
                    v: 0,
                },
            },
        },
    });
    t.end();
});

tape('map of structs of maps of structs', (t) => {
    const M = new MuRDAMap(new MuVarint(), new MuRDAStruct({
        m: new MuRDAMap(new MuASCII(), new MuRDAStruct({
            date: new MuRDAConstant(new MuDate()),
        })),
    }));
    const store = M.createStore(M.stateSchema.identity);
    const dispatchers = M.action(store);

    const testApply = createTestApply(t, store, M);
    const testState = createTestState(t, store, M);

    testApply(dispatchers.set(16383, {
        m: {},
    }), true);
    testState({
        16383: {
            m: {},
        },
    });
    testApply(dispatchers.move(16383, 16384), true);
    testState({
        16384: {
            m: {},
        },
    });
    t.end();
});

tape('struct', (t) => {
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
