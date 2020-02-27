import test = require('tape');

import { MuInt32, MuStruct, MuUTF8, MuInt8, MuFloat64, MuASCII } from '../../schema';
import { MuRDAConstant, MuRDARegister, MuRDAList, MuRDAMap, MuRDAStruct } from '../index';

test('action - constant', (t) => {
    const C = new MuRDAConstant(new MuInt32(1));
    t.deepEqual(C.action, {}, 'constants have no actions');
    t.end();
});

test('action - register', (t) => {
    const X = new MuRDARegister(new MuInt32(1));
    t.equals(X.action(1), 1, 'set to 1');
    t.equals(X.action(2), 2, 'set to 2');

    const Y = new MuRDARegister(new MuStruct({
        i: new MuInt32(1),
        u: new MuUTF8('foo'),
    }));
    const s = { i: 3, u: 'bar' };
    t.deepEqual(Y.action(s), s, 'set complex register');
    t.isNot(Y.action(s), s, 'should be a copy');
    t.end();
});

test('action - list', (t) => {
    const L = new MuRDAList(new MuRDARegister(new MuFloat64()));
    const store = L.createStore([]);
    const dispatchers = L.action(store);
    let action;

    t.deepEqual(dispatchers.pop(), { type: 'remove', data: [] }, 'pop when empty');
    t.deepEqual(dispatchers.shift(), { type: 'remove', data: [] }, 'shift when empty');
    t.deepEqual(dispatchers.update(0), {}, 'update when empty');

    action = dispatchers.push([0, 1, 2, 3]);
    store.apply(L, action);
    t.equal(action.type, 'insert', 'push type');
    t.equal(action.data.length, 4, 'push 4 number');
    t.deepEqual(action.data.map((a) => a.value).sort(), [0, 1, 2, 3], 'push content');

    action = dispatchers.pop();
    t.equal(action.type, 'remove', 'pop type');
    t.equal(action.data.length, 1, 'pop 1 member');

    action = dispatchers.shift(5);
    t.equal(action.type, 'remove', 'shift type');
    t.equal(action.data.length, 4, 'cannot shift more than number of members');

    action = dispatchers.unshift([3, 2, 1]);
    store.apply(L, action);
    t.equal(action.type, 'insert', 'unshift type');
    t.equal(action.data.length, 3, 'unshift 3 number');
    t.deepEqual(action.data.map((a) => a.value).sort(), [1, 2, 3], 'unshift content');

    action = dispatchers.pop(8);
    t.equal(action.data.length, store.state(L, []).length, 'cannot pop more than number of members');

    action = dispatchers.clear();
    t.equal(action.type, 'reset', 'clear type');
    t.deepEqual(action.data, [], 'clear data');

    action = dispatchers.reset([1, 1, 2]);
    store.apply(L, action);
    t.equal(action.type, 'reset', 'reset type');
    t.deepEqual(action.data.length, 3, 'reset data');

    action = dispatchers.update(0)(0);
    t.equal(action.type, 'update', 'update type');
    t.equal(action.data.action, 0, 'update content');
    t.end();
});

test('action - map', (t) => {
    const M = new MuRDAMap(new MuASCII(), new MuRDARegister(new MuUTF8()));
    const store = M.createStore({foo: 'bar'});
    const dispatchers = M.action(store);

    // t.deepEqual(dispatchers.remove('nonexistent'), {
    //     type: 'remove',
    //     data: 'nonexistent',
    // }, 'remove nonexistent');
    // t.deepEqual(dispatchers.remove('foo'), {
    //     type: 'remove',
    //     data: 'foo',
    // }, 'remove foo');

    // t.deepEqual(dispatchers.set('nonexistent', 'whatever'), {
    //     type: 'set',
    //     data: { id: 'nonexistent', value: 'whatever' },
    // }, 'set nonexistent');
    // t.deepEqual(dispatchers.set('foo', 'blah'), {
    //     type: 'set',
    //     data: { id: 'foo', value: 'blah' },
    // }, 'set foo');

    // t.deepEqual(dispatchers.update('nonexistent')('whatever'), {
    //     type: 'noop',
    //     data: undefined,
    // }, 'update nonexistent');
    // t.deepEqual(dispatchers.update('foo')('qux'), {
    //     type: 'update',
    //     data: { id: 'foo', action: 'qux' },
    // }, 'update foo');

    // t.deepEqual(dispatchers.reset({ bar: 'foo' }), {
    //     type: 'reset',
    //     data: [ { id: 'bar', store: 'foo' } ],
    // }, 'reset');
    // t.deepEqual(dispatchers.clear(), {
    //     type: 'reset',
    //     data: [],
    // }, 'clear');
    t.end();
});

test('action - struct', (t) => {
    const S = new MuRDAStruct({
        i: new MuRDAConstant(new MuInt32(1)),
        u: new MuRDARegister(new MuUTF8('foo')),
    });
    const store = S.createStore(S.stateSchema.identity);
    t.deepEqual(S.action(store).i, {}, 'struct constant also has no actions');
    t.deepEqual(S.action(store).u('bar'), {type: 'u', data: 'bar'}, 'struct register update');
    t.end();
});

test('action - nested struct', (t) => {
    const S = new MuRDAStruct({
        one: new MuRDARegister(new MuUTF8()),
        two: new MuRDAStruct({
            foo: new MuRDARegister(new MuInt8(1)),
        }),
        three: new MuRDAStruct({
            x: new MuRDARegister(new MuInt32(1)),
            y: new MuRDAStruct({
                bar: new MuRDARegister(new MuUTF8()),
            }),
        }),
    });
    const store = S.createStore(S.stateSchema.identity);

    t.deepEqual(S.action(store).one('baz'), {
        type: 'one',
        data: 'baz',
    }, 'one level deep action constructor');

    t.deepEqual(S.action(store).two.foo(666), {
        type: 'two',
        data: {
            type: 'foo',
            data: 666,
        },
    }, 'two level deep action constructor');

    t.deepEqual(S.action(store).three.y.bar('qux'), {
        type: 'three',
        data: {
            type: 'y',
            data: {
                type: 'bar',
                data: 'qux',
            },
        },
    }, 'three level deep action constructor');
    t.end();
});

// test('action - map of maps', (t) => {
//     const M = new MuRDAMap(new MuUTF8(), new MuRDAMap(
//         new MuUTF8(),
//         new MuRDARegister(new MuUTF8()),
//     ));
//     const store = M.createStore({ foo: { bar: 'blah' } });
//     const dispatchers = M.action(store);

//     t.deepEqual(dispatchers.update('foo').remove('nonexistent'), {
//         type: 'update',
//         data: {
//             id: 'foo',
//             action: { type: 'remove', data: 'nonexistent' },
//         },
//     }, 'update foo remove nonexistent');
//     t.deepEqual(dispatchers.update('foo').remove('bar'), {
//         type: 'update',
//         data: {
//             id: 'foo',
//             action: { type: 'remove', data: 'bar' },
//         },
//     }, 'update foo remove bar');

//     t.deepEqual(dispatchers.update('foo').clear(), {
//         type: 'update',
//         data: {
//             id: 'foo',
//             action: { type: 'reset', data: {} },
//         },
//     }, 'update foo clear');
//     t.deepEqual(dispatchers.set('foo', {}), {
//         type: 'set',
//         data: { id: 'foo', value: {} },
//     }, 'set foo to empty');

//     t.deepEqual(dispatchers.update('foo').set('Iñtërnâtiônàlizætiøn☃💩', 'Iñtërnâtiônàlizætiøn☃💩'), {
//         type: 'update',
//         data: {
//             id: 'foo',
//             action: {
//                 type: 'set',
//                 data: { id: 'Iñtërnâtiônàlizætiøn☃💩', value: 'Iñtërnâtiônàlizætiøn☃💩' },
//             },
//         },
//     }, `set foo['Iñtërnâtiônàlizætiøn☃💩']`);

//     t.deepEqual(dispatchers.update('foo').update('nonexistent')('whatever'), {
//         type: 'update',
//         data: {
//             id: 'foo',
//             action: { type: 'noop', data: undefined },
//         },
//     }, 'update foo.nonexistent');

//     t.deepEqual(dispatchers.update('foo').set('bar', 'quux'), {
//         type: 'update',
//         data: {
//             id: 'foo',
//             action: {
//                 type: 'set',
//                 data: { id: 'bar', value: 'quux' },
//             },
//         },
//     }, 'update foo set bar');
//     t.deepEqual(dispatchers.update('foo').update('bar')('quux'), {
//         type: 'update',
//         data: {
//             id: 'foo',
//             action: {
//                 type: 'update',
//                 data: { id: 'bar', action: 'quux' },
//             },
//         },
//     }, 'update foo update bar');
//     t.deepEqual(dispatchers.update('foo').reset({ bar: 'quux' }), {
//         type: 'update',
//         data: {
//             id: 'foo',
//             action: {
//                 type: 'reset',
//                 data: [ { id: 'bar', store: 'quux' } ],
//             },
//         },
//     }, 'update foo reset');
//     t.deepEqual(dispatchers.set('foo', { qux: 'quux' }), {
//         type: 'set',
//         data: {
//             id: 'foo',
//             value: { qux: 'quux' },
//         },
//     }, 'set foo');
//     t.end();
// });

// test('action - map of structs', (t) => {
//     const X = new MuRDAMap(
//         new MuUTF8(),
//         new MuRDAStruct({
//             a: new MuRDAConstant(new MuInt32(1)),
//             b: new MuRDARegister(new MuFloat64()),
//             c: new MuRDAStruct({
//                 y: new MuRDARegister(new MuFloat64(1)),
//             }),
//         }));

//     const store = X.createStore({
//         foo: {
//             a: 3,
//             b: 2,
//             c: {
//                 y: 666,
//             },
//         },
//     });

//     t.same(X.action(store).update('foo').c.y(3), {
//         type: 'update',
//         data: {
//             id: 'foo',
//             action: {
//                 type: 'c',
//                 data: {
//                     type: 'y',
//                     data: 3,
//                 },
//             },
//         },
//     }, 'update map struct');

//     t.end();
// });

// test('action - map of structs of map of structs', (t) => {
//     const X = new MuRDAMap(new MuUTF8(), new MuRDAStruct({
//         props: new MuRDAMap(new MuUTF8(), new MuRDAStruct({
//             color: new MuRDARegister(new MuUTF8()),
//             weight: new MuRDARegister(new MuFloat64()),
//         })),
//         foo: new MuRDAConstant(new MuFloat64()),
//     }));

//     const store = X.createStore({
//         'foo': {
//             props: {
//                 'x': {
//                     color: 'red',
//                     weight: Infinity,
//                 },
//             },
//             foo: 1,
//         },
//         'bar': {
//             props: {
//                 'y': {
//                     color: 'blue',
//                     weight: 0,
//                 },
//                 'z': {
//                     color: 'green',
//                     weight: 1,
//                 },
//             },
//             foo: 1,
//         },
//     });

//     const setG = X.action(store).set('g', {
//         props: {
//             h: {
//                 color: '',
//                 weight: -1,
//             },
//         },
//         foo: -1,
//     });
//     t.same(setG, {
//         type: 'set',
//         data: {
//             id: 'g',
//             value: {
//                 props: {
//                     h: {
//                         color: '',
//                         weight: -1,
//                     },
//                 },
//                 foo: -1,
//             },
//         },
//     }, 'set constructor ok');

//     const updateSubG = X.action(store).update('foo').props.update('x').color('purple');
//     t.same(updateSubG, {
//         type: 'update',
//         data: {
//             id: 'foo',
//             action: {
//                 type: 'props',
//                 data: {
//                     type: 'update',
//                     data: {
//                         id: 'x',
//                         action: {
//                             type: 'color',
//                             data: 'purple',
//                         },
//                     },
//                 },
//             },
//         },
//     });

//     t.end();
// });
