import test = require('tape');

import { MuFloat64, MuStruct, MuUint32, MuUTF8, MuInt8 } from '../../schema';
import { MuRDAConstant, MuRDARegister, MuRDAList, MuRDAMap, MuRDAStruct } from '../index';

test('apply - constant', (t) => {
    const store = new MuRDAConstant(new MuFloat64()).createStore(0);
    t.false(store.apply(), 'always false');
    t.end();
});

test('apply - register', (t) => {
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

test('apply - list', (t) => {
    const L = new MuRDAList(new MuRDARegister(new MuInt8()));
    const store = L.createStore([]);
    const dispatchers = L.action(store);
    let action;

    function assertState (expected:number[]) {
        t.deepEqual(store.state(L, L.stateSchema.alloc()), expected, JSON.stringify(action));
    }

    t.true(store.apply(L, action = dispatchers.push([1, 2, 3, 4, 5])), 'push');
    assertState([1, 2, 3, 4, 5]);
    t.true(store.apply(L, action = dispatchers.pop()), 'pop 1');
    assertState([1, 2, 3, 4]);
    t.true(store.apply(L, action = dispatchers.pop(2)), 'pop 2');
    assertState([1, 2]);
    t.true(store.apply(L, action = dispatchers.pop(3)), 'pop 3');
    assertState([]);
    t.true(store.apply(L, action = dispatchers.unshift([1, 3, 5])), 'unshift');
    assertState([1, 3, 5]);
    t.throws(() => store.apply(L, action = dispatchers.update(3)(6)), TypeError, 'update [3]');
    t.true(store.apply(L, action = dispatchers.update(2)(6)), 'update [2]');
    assertState([1, 3, 6]);
    t.true(store.apply(L, action = dispatchers.insert(0, [0])), 'insert at [0]');
    assertState([0, 1, 3, 6]);
    t.true(store.apply(L, action = dispatchers.insert(2, [2])), 'insert at [2]');
    assertState([0, 1, 2, 3, 6]);
    t.true(store.apply(L, action = dispatchers.insert(4, [4, 5])), 'insert at [4]');
    assertState([0, 1, 2, 3, 4, 5, 6]);
    t.true(store.apply(L, action = dispatchers.remove(7)), 'remove [7]');
    assertState([0, 1, 2, 3, 4, 5, 6]);
    t.true(store.apply(L, action = dispatchers.remove(2, 2)), 'remove [2]');
    assertState([0, 1, 4, 5, 6]);
    t.true(store.apply(L, action = dispatchers.shift()), 'shift 1');
    assertState([1, 4, 5, 6]);
    t.true(store.apply(L, action = dispatchers.shift(2)), 'shift 2');
    assertState([5, 6]);
    t.true(store.apply(L, action = dispatchers.shift(3)), 'shift 3');
    assertState([]);
    t.true(store.apply(L, action = dispatchers.insert(-1, [7, 7, 7])), 'insert at [7]');
    assertState([7, 7, 7]);
    t.true(store.apply(L, action = dispatchers.clear()), 'clear');
    assertState([]);
    t.true(store.apply(L, action = dispatchers.insert(1, [7, 7, 7])), 'insert at [7]');
    assertState([7, 7, 7]);
    t.true(store.apply(L, action = dispatchers.reset([1, 2, 3])), 'reset');
    assertState([1, 2, 3]);
    t.true(store.apply(L, action = dispatchers.reset([4, 5, 6])), 'reset again');
    assertState([4, 5, 6]);
    t.true(store.apply(L, action = dispatchers.clear()), 'clear');
    assertState([]);
    t.end();
});

test('apply - map', (t) => {
    const M = new MuRDAMap(new MuUTF8(), new MuRDAConstant(new MuFloat64()));
    const store = M.createStore(M.stateSchema.identity);
    const dispatchers = M.action(store);
    let action;

    function assertState (expected) {
        t.deepEqual(store.state(M, M.stateSchema.alloc()), expected, JSON.stringify(action));
    }

    const e = Math.E;
    const pi = Math.PI;
    const log2e = Math.LOG2E;
    const log10e = Math.LOG10E;

    t.true(store.apply(M, action = dispatchers.clear()), 'clear when empty');
    assertState({});
    t.true(store.apply(M, action = dispatchers.set('--unstable', Infinity)), 'set entry');
    assertState({'--unstable': Infinity});
    t.true(store.apply(M, action = dispatchers.set('--unstable', -Infinity)), 'set existent entry');
    assertState({'--unstable': -Infinity});
    t.true(store.apply(M, action = dispatchers.remove('--unstable')), 'remove entry');
    assertState({});
    t.false(store.apply(M, action = dispatchers.remove('--unstable')), 'remove nonexistent entry');
    assertState({});
    t.true(store.apply(M, action = dispatchers.set('e', e)), 'set e');
    assertState({e});
    t.true(store.apply(M, action = dispatchers.set('pi', pi)), 'set pi');
    assertState({e, pi});
    t.true(store.apply(M, action = <any>{type: 'noop', data: 'whatever'}), 'noop');
    assertState({e, pi});
    t.true(store.apply(M, action = dispatchers.reset({log2e, log10e})), 'reset');
    assertState({log2e, log10e});
    t.false(store.apply(M, action = dispatchers.move('nonexistent', '--non-existent')), 'move nonexistent');
    assertState({log2e, log10e});
    t.false(store.apply(M, action = dispatchers.move('log2e', 'log2e')), 'move log2e to log2e');
    assertState({log2e, log10e});
    t.true(store.apply(M, action = dispatchers.move('log10e', 'logE')), 'move log10e to logE');
    assertState({log2e, logE: log10e});
    t.true(store.apply(M, action = dispatchers.set('foo', 1)), 'set foo');
    t.true(store.apply(M, action = dispatchers.set('bar', 2)), 'set bar');
    assertState({log2e, logE: log10e, foo: 1, bar: 2});
    t.true(store.apply(M, action = dispatchers.move('foo', 'bar')), 'move foo to bar');
    assertState({log2e, logE: log10e, bar: 1});
    t.true(store.apply(M, action = dispatchers.clear()), 'clear');
    assertState({});
    t.true(store.apply(M, action = dispatchers.set('Iñtërnâtiônàlizætiøn☃💩', 0)), 'key with emoji');
    assertState({'Iñtërnâtiônàlizætiøn☃💩': 0});
    t.end();
});

test('apply - struct', (t) => {
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

test('apply - map of structs', (t) => {
    const M = new MuRDAMap(new MuUTF8(), new MuRDAStruct({
        r: new MuRDARegister(new MuFloat64()),
        s: new MuRDAStruct({
            r: new MuRDARegister(new MuUTF8()),
        }),
    }));
    const store = M.createStore(M.stateSchema.identity);
    const dispatchers = M.action(store);
    let action;

    function assertState (expected) {
        t.deepEqual(store.state(M, M.stateSchema.alloc()), expected, JSON.stringify(action));
    }

    t.true(store.apply(M, action = dispatchers.set('first', {r: 11.11, s: {r: '11.22'}})), 'set entry');
    assertState({first: {r: 11.11, s: {r: '11.22'}}});
    t.true(store.apply(M, action = dispatchers.set('second', M.valueRDA.stateSchema.alloc())), 'set another');
    assertState({first: {r: 11.11, s: {r: '11.22'}}, second: {r: 0, s: {r: ''}}});
    t.true(store.apply(M, action = dispatchers.update('second').r(22.11)), 'set inner entry');
    assertState({first: {r: 11.11, s: {r: '11.22'}}, second: {r: 22.11, s: {r: ''}}});
    t.true(store.apply(M, action = dispatchers.update('second').s.r('22.22')), 'set innermost entry');
    assertState({first: {r: 11.11, s: {r: '11.22'}}, second: {r: 22.11, s: {r: '22.22'}}});
    t.true(store.apply(M, action = dispatchers.update('vanished').s.r('22.22')), 'update non-existent entry');
    assertState({first: {r: 11.11, s: {r: '11.22'}}, second: {r: 22.11, s: {r: '22.22'}}});
    t.false(store.apply(M, action = <any>{type: 'update', data: {id: 'imaginary', action: {type: 'r', data: 0}}}), 'update non-existent entry');
    assertState({first: {r: 11.11, s: {r: '11.22'}}, second: {r: 22.11, s: {r: '22.22'}}});

    const defaultMap = {
        x: {r: 0, s: {r: ''}},
        y: {r: 0, s: {r: ''}},
        z: {r: 0, s: {r: ''}},
    };
    t.true(store.apply(M, action = dispatchers.reset(defaultMap)), 'reset');
    assertState(defaultMap);

    t.true(store.apply(M, action = dispatchers.clear()), 'clear');
    assertState({});
    t.end();
});

test('apply - map of maps', (t) => {
    const M = new MuRDAMap(
        new MuUTF8(),
        new MuRDAMap(new MuUTF8(), new MuRDARegister(new MuFloat64())),
    );
    const store = M.createStore(M.stateSchema.identity);
    const dispatchers = M.action(store);
    let action;

    function assertState (expected) {
        t.deepEqual(store.state(M, M.stateSchema.alloc()), expected, JSON.stringify(action));
    }

    const e = Math.E;
    const pi = Math.PI;
    const log2e = Math.LOG2E;
    const log10e = Math.LOG10E;

    t.true(store.apply(M, action = dispatchers.set('constants', {})), 'set outer entry');
    assertState({constants: {}});
    t.true(store.apply(M, action = dispatchers.update('constants').clear()), 'clear when empty');
    assertState({constants: {}});
    t.true(store.apply(M, action = dispatchers.update('constants').set('--non-existent', Infinity)), 'set entry');
    assertState({constants: {'--non-existent': Infinity}});
    t.true(store.apply(M, action = dispatchers.update('constants').set('--non-existent', -Infinity)), 'set entry again');
    assertState({constants: {'--non-existent': -Infinity}});
    t.true(store.apply(M, action = dispatchers.update('constants').remove('--non-existent')), 'remove entry');
    assertState({constants: {}});
    t.false(store.apply(M, action = dispatchers.update('constants').remove('--non-existent')), 'remove non-existent entry');
    assertState({constants: {}});
    t.true(store.apply(M, action = dispatchers.update('constants').set('e', e)), 'set e');
    assertState({constants: {e}});
    t.true(store.apply(M, action = dispatchers.update('constants').set('pi', pi)), 'set pi');
    assertState({constants: {e, pi}});
    t.true(store.apply(M, action = dispatchers.update('constants').reset({log2e, log10e})), 'reset');
    assertState({constants: {log2e, log10e}});
    t.true(store.apply(M, action = dispatchers.update('constants').clear()), 'clear');
    assertState({constants: {}});
    t.end();
});

test('apply - map of structs of map of structs', (t) => {
    const M = new MuRDAMap(new MuUTF8(), new MuRDAStruct({
        m: new MuRDAMap(new MuUTF8(), new MuRDAStruct({
            rf: new MuRDARegister(new MuFloat64()),
            ru: new MuRDARegister(new MuUTF8()),
        })),
    }));
    const store = M.createStore(M.stateSchema.identity);
    const dispatchers = M.action(store);
    let action;

    function assertState (expected) {
        t.deepEqual(store.state(M, M.stateSchema.alloc()), expected, JSON.stringify(action));
    }

    t.true(store.apply(M, action = dispatchers.set('outer', M.valueRDA.stateSchema.alloc())));
    assertState({outer: {m: {}}});
    t.true(store.apply(M, action = dispatchers.update('outer').m.set('inner', M.valueRDA.rdas.m.valueRDA.stateSchema.alloc())));
    assertState({outer: {m: {inner: {rf: 0, ru: ''}}}});
    t.true(store.apply(M, action = dispatchers.update('outer').m.update('inner').rf(111.111)), 'update inner prop');
    assertState({outer: {m: {inner: {rf: 111.111, ru: ''}}}});
    t.true(store.apply(M, action = dispatchers.update('outer').m.update('inner').ru('111.222')), 'update another inner prop');
    assertState({outer: {m: {inner: {rf: 111.111, ru: '111.222'}}}});
    t.true(store.apply(M, action = dispatchers.update('outer').m.reset({inner: {rf: 222.111, ru: '222.222'}})), 'reset');
    assertState({outer: {m: {inner: {rf: 222.111, ru: '222.222'}}}});
    t.true(store.apply(M, action = dispatchers.update('outer').m.clear()), 'clear');
    assertState({outer: {m: {}}});
    t.end();
});

test('apply - list of lists', (t) => {
    const L = new MuRDAList(new MuRDAList(new MuRDARegister(new MuFloat64())));
    const store = L.createStore([]);
    const dispatchers = L.action(store);
    let action;

    function assertState (expected) {
        t.deepEqual(store.state(L, L.stateSchema.alloc()), expected, JSON.stringify(action));
    }

    t.deepEqual(action = dispatchers.update(0), {}, 'update before push');
    assertState([]);
    t.true(store.apply(L, action = dispatchers.push([[0], [], [1, 2], [3, 4, 5]])), 'outer push');
    assertState([[0], [], [1, 2], [3, 4, 5]]);
    t.true(store.apply(L, action = dispatchers.pop(2)), 'outer pop');
    assertState([[0], []]);
    t.true(store.apply(L, action = dispatchers.update(1).pop()), 'pop when empty');
    assertState([[0], []]);
    t.true(store.apply(L, action = dispatchers.update(1).shift(2)), 'shift when empty');
    assertState([[0], []]);
    t.true(store.apply(L, action = dispatchers.update(1).push([0, 1, 2, 3, 4, 5, 6])), 'push when empty');
    assertState([[0], [0, 1, 2, 3, 4, 5, 6]]);
    t.true(store.apply(L, action = dispatchers.update(1).pop()), 'pop');
    assertState([[0], [0, 1, 2, 3, 4, 5]]);
    t.true(store.apply(L, action = dispatchers.update(1).pop(2)), 'pop 2');
    assertState([[0], [0, 1, 2, 3]]);
    t.true(store.apply(L, action = dispatchers.update(1).shift()), 'shift');
    assertState([[0], [1, 2, 3]]);
    t.true(store.apply(L, action = dispatchers.update(1).shift(3)), 'shift 3');
    assertState([[0], []]);
    t.true(store.apply(L, action = dispatchers.update(1).unshift([0, 1, 2])), 'unshift when empty');
    assertState([[0], [0, 1, 2]]);
    t.true(store.apply(L, action = dispatchers.update(1).insert(1, [1, 2])), 'insert');
    assertState([[0], [0, 1, 2, 1, 2]]);
    t.true(store.apply(L, action = dispatchers.update(1).insert(3, [1, 2])), 'insert');
    assertState([[0], [0, 1, 2, 1, 2, 1, 2]]);
    t.true(store.apply(L, action = dispatchers.update(1).remove(2, 4)), 'remove');
    assertState([[0], [0, 1, 2]]);
    t.true(store.apply(L, action = dispatchers.update(1).push([3, 4, 5])), 'push');
    assertState([[0], [0, 1, 2, 3, 4, 5]]);
    t.true(store.apply(L, action = dispatchers.update(1).unshift([3, 4, 5])), 'unshift');
    assertState([[0], [3, 4, 5, 0, 1, 2, 3, 4, 5]]);
    t.true(store.apply(L, action = dispatchers.update(1).clear()), 'clear');
    assertState([[0], []]);
    t.true(store.apply(L, action = dispatchers.update(1).reset([0, 1, 2, 6, 4, 5])), 'reset');
    assertState([[0], [0, 1, 2, 6, 4, 5]]);
    t.true(store.apply(L, action = dispatchers.update(1).update(3)(3)), 'update');
    assertState([[0], [0, 1, 2, 3, 4, 5]]);
    t.end();
});

test('apply - list of structs of list of structs', (t) => {
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

    function assertState (expected) {
        t.deepEqual(store.state(L, L.stateSchema.alloc()), expected, JSON.stringify(action));
    }

    t.deepEqual(action = dispatchers.update(0), {}, 'update before push');
    assertState([]);
    t.true(store.apply(L, action = dispatchers.pop()), 'outer pop when empty');
    assertState([]);
    t.true(store.apply(L, action = dispatchers.shift()), 'outer shift when empty');
    assertState([]);
    t.true(store.apply(L, action = dispatchers.push([{s: {f: 11.11}, l: []}, {s: {f: 22.11}, l: [{u: '22.11'}]}])), 'outer push');
    assertState([{s: {f: 11.11}, l: []}, {s: {f: 22.11}, l: [{u: '22.11'}]}]);
    t.true(store.apply(L, action = dispatchers.update(0).s.f(11.22)), 'update [0].s.f');
    assertState([{s: {f: 11.22}, l: []}, {s: {f: 22.11}, l: [{u: '22.11'}]}]);
    t.true(store.apply(L, action = dispatchers.update(1).s.f(22.22)), 'update [1].s.f');
    assertState([{s: {f: 11.22}, l: []}, {s: {f: 22.22}, l: [{u: '22.11'}]}]);
    t.true(store.apply(L, action = dispatchers.update(1).l.update(0).u('22.22')), 'update [1].l[0].u');
    assertState([{s: {f: 11.22}, l: []}, {s: {f: 22.22}, l: [{u: '22.22'}]}]);
    t.true(store.apply(L, action = dispatchers.pop()), 'outer pop');
    assertState([{s: {f: 11.22}, l: []}]);
    t.true(store.apply(L, action = dispatchers.update(0).l.pop()), 'pop when empty');
    assertState([{s: {f: 11.22}, l: []}]);
    t.true(store.apply(L, action = dispatchers.update(0).l.shift()), 'shift when empty');
    assertState([{s: {f: 11.22}, l: []}]);
    t.true(store.apply(L, action = dispatchers.update(0).l.push([{u: '11.11'}, {u: '11.22'}, {u: '11.33'}])), 'push');
    assertState([{s: {f: 11.22}, l: [{u: '11.11'}, {u: '11.22'}, {u: '11.33'}]}]);
    t.true(store.apply(L, action = dispatchers.update(0).l.pop()), 'pop');
    assertState([{s: {f: 11.22}, l: [{u: '11.11'}, {u: '11.22'}]}]);
    t.true(store.apply(L, action = dispatchers.update(0).l.shift()), 'shift');
    assertState([{s: {f: 11.22}, l: [{u: '11.22'}]}]);
    t.true(store.apply(L, action = dispatchers.update(0).l.unshift([{u: '11.00'}, {u: '11.11'}])), 'unshift');
    assertState([{s: {f: 11.22}, l: [{u: '11.00'}, {u: '11.11'}, {u: '11.22'}]}]);
    t.true(store.apply(L, action = dispatchers.update(0).l.insert(1, [{u: '11.33'}])), 'insert');
    assertState([{s: {f: 11.22}, l: [{u: '11.00'}, {u: '11.33'}, {u: '11.11'}, {u: '11.22'}]}]);
    t.true(store.apply(L, action = dispatchers.update(0).l.insert(1, [{u: '11.11'}, {u: '11.22'}])), 'insert 2');
    assertState([{s: {f: 11.22}, l: [{u: '11.00'}, {u: '11.11'}, {u: '11.22'}, {u: '11.33'}, {u: '11.11'}, {u: '11.22'}]}]);
    t.true(store.apply(L, action = dispatchers.update(0).l.remove(1)), 'remove');
    assertState([{s: {f: 11.22}, l: [{u: '11.00'}, {u: '11.22'}, {u: '11.33'}, {u: '11.11'}, {u: '11.22'}]}]);
    t.true(store.apply(L, action = dispatchers.update(0).l.remove(1, 2)), 'remove 2');
    assertState([{s: {f: 11.22}, l: [{u: '11.00'}, {u: '11.11'}, {u: '11.22'}]}]);
    t.true(store.apply(L, action = dispatchers.update(0).l.clear()), 'clear');
    assertState([{s: {f: 11.22}, l: []}]);
    t.true(store.apply(L, action = dispatchers.update(0).l.reset([{u: '11.33'}, {u: '11.44'}, {u: '11.55'}])), 'reset');
    assertState([{s: {f: 11.22}, l: [{u: '11.33'}, {u: '11.44'}, {u: '11.55'}]}]);
    t.end();
});
