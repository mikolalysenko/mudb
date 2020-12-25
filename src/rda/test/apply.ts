import * as tape from 'tape';
import { MuFloat64, MuStruct, MuUint32, MuUTF8, MuInt8, MuASCII, MuVarint, MuBoolean, MuDate } from '../../schema';
import { MuRDA, MuRDAStore, MuRDAConstant, MuRDARegister, MuRDAList, MuRDAMap, MuRDAStruct } from '../index';

function createTest<T extends MuRDA<any, any, any, any>> (t:tape.Test, store:MuRDAStore<T>, rda:T) {
    return function (action:T['actionSchema']['identity'], stateAfter:T['stateSchema']['identity']) {
        t.equal(store.apply(rda, action), true, JSON.stringify(action));
        t.deepEqual(store.state(rda, rda.stateSchema.alloc()), stateAfter);
    };
}

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

tape('list of lists', (t) => {
    const L = new MuRDAList(new MuRDAList(new MuRDARegister(new MuInt8())));
    const store = L.createStore([]);
    const dispatchers = L.action(store);
    const test = createTest(t, store, L);

    test(dispatchers.push([]), [[]]);
    test(dispatchers.update(0).push(), [[]]);
    test(dispatchers.update(0).push(1), [[1]]);
    test(dispatchers.update(0).push(2, 3), [[1, 2, 3]]);
    test(dispatchers.update(0).pop(), [[1, 2]]);
    test(dispatchers.update(0).pop(2), [[]]);
    test(dispatchers.update(0).pop(3), [[]]);
    test(dispatchers.update(0).unshift(5), [[5]]);
    test(dispatchers.update(0).unshift(1, 3), [[1, 3, 5]]);
    test(dispatchers.update(0).update(2)(6), [[1, 3, 6]]);
    test(dispatchers.update(0).splice(0, 0, 0), [[0, 1, 3, 6]]);
    test(dispatchers.update(0).splice(2, 0, 2), [[0, 1, 2, 3, 6]]);
    test(dispatchers.update(0).splice(4, 0, 4, 5), [[0, 1, 2, 3, 4, 5, 6]]);
    test(dispatchers.update(0).splice(7, 1), [[0, 1, 2, 3, 4, 5, 6]]);
    test(dispatchers.update(0).splice(2, 2), [[0, 1, 4, 5, 6]]);
    test(dispatchers.update(0).splice(1, 3, 5, 4, 1), [[0, 5, 4, 1, 6]]);
    test(dispatchers.update(0).swap(1, 3), [[0, 1, 4, 5, 6]]);
    test(dispatchers.update(0).swap(4, 0), [[6, 1, 4, 5, 0]]);
    test(dispatchers.update(0).swap(4, 4), [[6, 1, 4, 5, 0]]);
    test(dispatchers.update(0).swap(4, 5), [[6, 1, 4, 5, 0]]);
    test(dispatchers.update(0).sort((a, b) => a - b), [[0, 1, 4, 5, 6]]);
    test(dispatchers.update(0).reverse(), [[6, 5, 4, 1, 0]]);
    test(dispatchers.update(0).reverse(), [[0, 1, 4, 5, 6]]);
    test(dispatchers.update(0).shift(), [[1, 4, 5, 6]]);
    test(dispatchers.update(0).shift(2), [[5, 6]]);
    test(dispatchers.update(0).shift(3), [[]]);
    test(dispatchers.update(0).reset([1, 2, 3]), [[1, 2, 3]]);
    test(dispatchers.update(0).reset([4, 5, 6]), [[4, 5, 6]]);
    test(dispatchers.update(0).clear(), [[]]);
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
    const test = createTest(t, store, L);

    test(dispatchers.pop(), []);
    test(dispatchers.shift(), []);
    test(dispatchers.push({s: {f: 11.11}, l: []}, {s: {f: 22.11}, l: [{u: '22.11'}]}), [{s: {f: 11.11}, l: []}, {s: {f: 22.11}, l: [{u: '22.11'}]}]);
    test(dispatchers.update(0).s.f(11.22), [{s: {f: 11.22}, l: []}, {s: {f: 22.11}, l: [{u: '22.11'}]}]);
    test(dispatchers.update(1).s.f(22.22), [{s: {f: 11.22}, l: []}, {s: {f: 22.22}, l: [{u: '22.11'}]}]);
    test(dispatchers.update(1).l.update(0).u('22.22'), [{s: {f: 11.22}, l: []}, {s: {f: 22.22}, l: [{u: '22.22'}]}]);
    test(dispatchers.pop(), [{s: {f: 11.22}, l: []}]);
    test(dispatchers.update(0).l.pop(), [{s: {f: 11.22}, l: []}]);
    test(dispatchers.update(0).l.shift(), [{s: {f: 11.22}, l: []}]);
    test(dispatchers.update(0).l.push({u: '11.11'}, {u: '11.22'}, {u: '11.33'}), [{s: {f: 11.22}, l: [{u: '11.11'}, {u: '11.22'}, {u: '11.33'}]}]);
    test(dispatchers.update(0).l.pop(), [{s: {f: 11.22}, l: [{u: '11.11'}, {u: '11.22'}]}]);
    test(dispatchers.update(0).l.shift(), [{s: {f: 11.22}, l: [{u: '11.22'}]}]);
    test(dispatchers.update(0).l.unshift({u: '11.00'}, {u: '11.11'}), [{s: {f: 11.22}, l: [{u: '11.00'}, {u: '11.11'}, {u: '11.22'}]}]);
    test(dispatchers.update(0).l.splice(1, 0, {u: '11.33'}), [{s: {f: 11.22}, l: [{u: '11.00'}, {u: '11.33'}, {u: '11.11'}, {u: '11.22'}]}]);
    test(dispatchers.update(0).l.splice(1, 0, {u: '11.11'}, {u: '11.22'}), [{s: {f: 11.22}, l: [{u: '11.00'}, {u: '11.11'}, {u: '11.22'}, {u: '11.33'}, {u: '11.11'}, {u: '11.22'}]}]);
    test(dispatchers.update(0).l.splice(1, 1), [{s: {f: 11.22}, l: [{u: '11.00'}, {u: '11.22'}, {u: '11.33'}, {u: '11.11'}, {u: '11.22'}]}]);
    test(dispatchers.update(0).l.splice(1, 2), [{s: {f: 11.22}, l: [{u: '11.00'}, {u: '11.11'}, {u: '11.22'}]}]);
    test(dispatchers.update(0).l.clear(), [{s: {f: 11.22}, l: []}]);
    test(dispatchers.update(0).l.reset([{u: '11.33'}, {u: '11.44'}, {u: '11.55'}]), [{s: {f: 11.22}, l: [{u: '11.33'}, {u: '11.44'}, {u: '11.55'}]}]);
    t.end();
});

tape('map of constants', (t) => {
    const M = new MuRDAMap(new MuVarint(), new MuRDAConstant(new MuDate()));
    const store = M.createStore(M.stateSchema.identity);
    const dispatchers = M.action(store);
    const test = createTest(t, store, M);

    test(dispatchers.clear(), {});
    test(dispatchers.move(0, 1), {});
    test(dispatchers.remove(0), {});
    test(dispatchers.reset({}), {});

    test(dispatchers.set(0, new Date(0)), {0: new Date(0)});
    test(dispatchers.set(1, new Date(1000)), {0: new Date(0), 1: new Date(1000)});
    test(dispatchers.move(1, 0), {0: new Date(1000)});
    test(dispatchers.move(0, 1), {1: new Date(1000)});
    test(dispatchers.set(2, new Date(2000)), {1: new Date(1000), 2: new Date(2000)});
    test(dispatchers.move(2, 1), {1: new Date(2000)});
    test(dispatchers.move(2, 0), {1: new Date(2000)});
    test(dispatchers.remove(1), {});
    test(dispatchers.move(1, 0), {});

    test(dispatchers.reset({0: new Date(0), 1: new Date(1000)}), {0: new Date(0), 1: new Date(1000)});
    test(dispatchers.reset({2: new Date(2000)}), {2: new Date(2000)});
    test(dispatchers.clear(), {});

    // contrived invalid actions
    test(dispatchers.reset({0: new Date(0)}), {0: new Date(0)});
    let action:any = dispatchers.remove(0);
    action.data.id = -1;
    t.equal(store.apply(M, action), false, JSON.stringify(action));
    t.deepEqual(store.state(M, M.stateSchema.alloc()), {0: new Date(0)});

    action = dispatchers.move(0, 1);
    action.data.id = -1;
    t.equal(store.apply(M, action), false, JSON.stringify(action));
    t.deepEqual(store.state(M, M.stateSchema.alloc()), {0: new Date(0)});

    action = dispatchers.set(1, new Date(1));
    action.type = 'foo';
    t.equal(store.apply(M, action), false, JSON.stringify(action));
    t.deepEqual(store.state(M, M.stateSchema.alloc()), {0: new Date(0)});
    t.end();
});

tape('map of maps of registers', (t) => {
    const M = new MuRDAMap(
        new MuASCII(),
        new MuRDAMap(new MuASCII(), new MuRDARegister(new MuVarint())),
    );
    const store = M.createStore(M.stateSchema.identity);
    const dispatchers = M.action(store);

    const test = createTest(t, store, M);

    test(dispatchers.update('a').clear(), {});
    test(dispatchers.update('a').set('a', 0), {});
    test(dispatchers.update('a').update('a')(1), {});
    test(dispatchers.update('a').move('a', 'b'), {});
    test(dispatchers.update('a').remove('b'), {});
    test(dispatchers.update('a').reset({'a': 0}), {});

    test(dispatchers.set('foo', {}), {foo: {}});
    test(dispatchers.update('foo').set('a', 0), {foo: {a: 0}});
    test(dispatchers.update('foo').set('a', 1), {foo: {a: 1}});
    test(dispatchers.update('foo').move('a', 'b'), {foo: {b: 1}});
    test(dispatchers.update('foo').move('b', 'b'), {foo: {b: 1}});
    test(dispatchers.update('foo').set('a', 0), {foo: {a: 0, b: 1}});
    test(dispatchers.update('foo').move('b', 'a'), {foo: {a: 1}});
    test(dispatchers.update('foo').move('b', 'c'), {foo: {a: 1}});
    test(dispatchers.update('foo').remove('a'), {foo: {}});
    test(dispatchers.update('foo').move('a', 'b'), {foo: {}});

    test(dispatchers.update('foo').reset({a: 0, b: 1}), {foo: {a: 0, b: 1}});
    test(dispatchers.update('foo').reset({c: 2}), {foo: {c: 2}});
    test(dispatchers.update('foo').update('c')(3), {foo: {c: 3}});
    test(dispatchers.update('foo').clear(), {foo: {}});
    test(dispatchers.clear(), {});
    test(dispatchers.reset({foo: {bar: 0}}), {foo: {bar: 0}});

    // contrived invalid actions
    let action:any = dispatchers.update('foo').update('bar')(1);
    action.data.id = -1;
    t.equal(store.apply(M, action), false, JSON.stringify(action));
    t.deepEqual(store.state(M, M.stateSchema.alloc()), {foo: {bar: 0}});

    action = dispatchers.update('foo').update('bar')(1);
    action.data.action.data.id = -1;
    t.equal(store.apply(M, action), false, JSON.stringify(action));
    t.deepEqual(store.state(M, M.stateSchema.alloc()), {foo: {bar: 0}});
    t.end();
});

tape('map of structs', (t) => {
    const M = new MuRDAMap(new MuVarint(), new MuRDAStruct({
        b: new MuRDARegister(new MuBoolean()),
        v: new MuRDARegister(new MuVarint()),
        u: new MuRDARegister(new MuUTF8()),
        d: new MuRDAConstant(new MuDate()),
    }));
    const store = M.createStore(M.stateSchema.identity);
    const dispatchers = M.action(store);
    const test = createTest(t, store, M);

    test(dispatchers.set(127, {b: false, v: 0, u: '', d: new Date(0)}), {127: {b: false, v: 0, u: '', d: new Date(0)}});
    test(dispatchers.move(127, 128), {128: {b: false, v: 0, u: '', d: new Date(0)}});
    test(dispatchers.update(128).b(true), {128: {b: true, v: 0, u: '', d: new Date(0)}});
    test(dispatchers.update(128).v(1), {128: {b: true, v: 1, u: '', d: new Date(0)}});
    test(dispatchers.update(128).u('Iñtërnâtiônàlizætiøn☃💩'), {128: {b: true, v: 1, u: 'Iñtërnâtiônàlizætiøn☃💩', d: new Date(0)}});
    test(dispatchers.remove(128), {});
    test(dispatchers.reset({128: {b: true, v: 1, u: 'Iñtërnâtiônàlizætiøn☃💩', d: new Date(0)}}), {128: {b: true, v: 1, u: 'Iñtërnâtiônàlizætiøn☃💩', d: new Date(0)}});
    test(dispatchers.clear(), {});
    t.end();
});

tape('map of structs of structs of structs', (t) => {
    const M = new MuRDAMap(
        new MuASCII(),
        new MuRDAStruct({
            s: new MuRDAStruct({
                s: new MuRDAStruct({
                    v: new MuRDARegister(new MuVarint()),
                }),
            }),
        }),
    );
    const store = M.createStore(M.stateSchema.identity);
    const dispatchers = M.action(store);
    const test = createTest(t, store, M);

    test(dispatchers.set('foo', {s: {s: {v: 0}}}), {foo: {s: {s: {v: 0}}}});
    test(dispatchers.move('foo', 'bar'), {bar: {s: {s: {v: 0}}}});
    test(dispatchers.update('bar').s.s.v(128), {bar: {s: {s: {v: 128}}}});
    test(dispatchers.move('bar', 'baz'), {baz: {s: {s: {v: 128}}}});
    test(dispatchers.update('bar').s.s.v(129), {baz: {s: {s: {v: 128}}}});
    test(dispatchers.remove('baz'), {});
    test(dispatchers.reset({
        bar: {s: {s: {v: 128}}},
        baz: {s: {s: {v: 0}}},
    }), {
        bar: {s: {s: {v: 128}}},
        baz: {s: {s: {v: 0}}},
    });
    test(dispatchers.move('bar', 'baz'), {baz: {s: {s: {v: 128}}}});
    test(dispatchers.clear(), {});
    t.end();
});

tape('map of structs of maps of structs', (t) => {
    const M = new MuRDAMap(new MuVarint(), new MuRDAStruct({
        m: new MuRDAMap(new MuASCII(), new MuRDAStruct({
            v: new MuRDARegister(new MuVarint()),
        })),
    }));
    const store = M.createStore(M.stateSchema.identity);
    const dispatchers = M.action(store);
    const test = createTest(t, store, M);

    test(dispatchers.set(16383, { m: {}}), {16383: {m: {}}});
    test(dispatchers.move(16383, 16384), {16384: {m: {}}});
    test(dispatchers.update(16384).m.set('foo', {v: 127}), {16384: {m: {foo: {v: 127}}}});
    test(dispatchers.update(16384).m.move('foo', 'bar'), {16384: {m: {bar: {v: 127}}}});
    test(dispatchers.update(16384).m.update('bar').v(128), {16384: {m: {bar: {v: 128}}}});
    test(dispatchers.update(16384).m.update('foo').v(128), {16384: {m: {bar: {v: 128}}}});
    test(dispatchers.update(16384).m.remove('bar'), {16384: {m: {}}});
    test(dispatchers.update(16384).m.reset({
        foo: {v: 127},
        bar: {v: 128},
    }), {16384: {m: {
        foo: {v: 127},
        bar: {v: 128},
    }}});
    test(dispatchers.update(16384).m.move('foo', 'bar'), {16384: {m: {bar: {v: 127}}}});
    test(dispatchers.update(16384).m.clear(), {16384: {m: {}}});
    t.end();
});

tape('non-empty output map', (t) => {
    const M = new MuRDAMap(new MuVarint(), new MuRDAConstant(new MuDate()));
    const store = M.createStore(M.stateSchema.identity);
    const dispatchers = M.action(store);

    t.deepEqual(store.state(M, {}), {});
    t.deepEqual(store.state(M, {0: new Date(0)}), {});

    store.apply(M, dispatchers.reset({127: new Date(127), 128: new Date(128)}));
    t.deepEqual(store.state(M, {0: new Date(0)}), {127: new Date(127), 128: new Date(128)});
    t.deepEqual(store.state(M, {127: new Date(0)}), {127: new Date(127), 128: new Date(128)});
    t.deepEqual(store.state(M, {127: new Date(127), 128: new Date(128)}), {127: new Date(127), 128: new Date(128)});

    store.apply(M, dispatchers.remove(127));
    t.deepEqual(store.state(M, {127: new Date(127), 128: new Date(128)}), {128: new Date(128)});
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
