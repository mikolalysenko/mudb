import test = require('tape');
import { MuInt32, MuStruct, MuUTF8, MuInt8, MuFloat64, MuSchema } from '../../schema';

import { MuRDAConstant } from '../constant';
import { MuRDARegister } from '../register';
import { MuRDAStruct } from '../struct';
import { MuRDAMap } from '../map';

test('constants', (t) => {
    const C = new MuRDAConstant(new MuInt32(1));
    t.equals(Object.keys(C.action).length, 0, 'constants have no actions');
    t.end();
});

test('registers', (t) => {
    const X = new MuRDARegister(new MuInt32(1));

    t.equals(X.action(1), 1, 'set register ok');
    t.equals(X.action(2), 2, 'set to 2 ok');

    const Y = new MuRDARegister(new MuStruct({
        a: new MuInt32(1),
        b: new MuUTF8('foo'),
    }));

    t.same(Y.action({
        a: 3,
        b: 'x',
    }), {
        a: 3,
        b: 'x',
    }, 'complex register ok');

    t.end();
});

test('structs', (t) => {
    const X = new MuRDAStruct({
        a: new MuRDAConstant(new MuInt32(1)),
        b: new MuRDARegister(new MuInt32(2)),
    });

    const store = X.createStore(X.stateSchema.identity);

    t.same(X.action(store).a, {}, 'struct constant empty actions');
    t.same(X.action(store).b(1), {
        type: 'b',
        data: 1,
    }, 'struct register update ok');

    t.end();
});

test('nested structs', (t) => {
    const Y = new MuRDAStruct({
        q: new MuRDARegister(new MuUTF8()),
        child: new MuRDAStruct({
            x: new MuRDARegister(new MuInt32(1)),
            y: new MuRDAStruct({
                foo: new MuRDARegister(new MuUTF8()),
            }),
        }),
        otherChild: new MuRDAStruct({
            bar: new MuRDARegister(new MuInt8(1)),
        }),
    });

    const store = Y.createStore(Y.stateSchema.identity);

    t.same(Y.action(store).q('baz'), {
        type: 'q',
        data: 'baz',
    }, 'one level deep action constructor ok');

    t.same(Y.action(store).child.y.foo('zzyzx'), {
        type: 'child',
        data: {
            type: 'y',
            data: {
                type: 'foo',
                data: 'zzyzx',
            },
        },
    }, 'nested action constructor ok');

    t.same(Y.action(store).otherChild.bar(666), {
        type: 'otherChild',
        data: {
            type: 'bar',
            data: 666,
        },
    }, 'another nested constructor works');

    t.end();
});

test('maps', (t) => {
    const X = new MuRDAMap(
        new MuUTF8(),
        new MuRDARegister(new MuFloat64(1)));

    const store = X.createStore({
        foo: 3,
        'ashdfhasdhfasdf': -1,
    });

    const anotherStore = X.createStore({
        blah: 71474.1888,
    });

    t.same(X.action(anotherStore).update('blah')(0), {
        type: 'update',
        data: {
            id: 'blah',
            action: 0,
        },
    }, 'update store blah gives 0');

    t.same(X.action(store).update('blah')(0), {
        type: 'noop',
        data: undefined,
    }, 'blah gives noop');

    t.same(X.action(store).clear(), {
        type: 'reset',
        data: [],
    }, 'clear action ok');
    t.same(X.action(store).update('xxxx')(1), {
        type: 'noop',
        data: undefined,
    }, 'noop update ok');
    t.same(X.action(store).set('foo', 1), {
        type: 'set',
        data: {
            id: 'foo',
            value: 1,
        },
    }, 'set action ok');
    t.same(X.action(store).remove('foo'), {
        type: 'remove',
        data: 'foo',
    }, 'remove action ok');
    t.same(X.action(store).update('foo')(666), {
        type: 'update',
        data: {
            id: 'foo',
            action: 666,
        },
    }, 'update action ok');

    t.end();
});

test('map of maps', (t) => {
    const X = new MuRDAMap(
        new MuUTF8(),
        new MuRDAMap(
            new MuUTF8(),
            new MuRDARegister(new MuUTF8())));

    const store = X.createStore({ foo: { bar: '1' }});
    t.same(X.action(store).set('foo', { 'bar': '1' }), {
        type: 'set',
        data: {
            id: 'foo',
            value: {
                bar: '1',
            },
        },
    }, 'set map of maps ok');
    t.same(X.action(store).update('foo').update('bar')('3'), {
        type: 'update',
        data: {
            id: 'foo',
            action: {
                type: 'update',
                data: {
                    id: 'bar',
                    action: '3',
                },
            },
        },
    }, 'update foo.bar to "3"');
    t.same(X.action(store).update('foo').set('x', 'yy'), {
        type: 'update',
        data: {
            id: 'foo',
            action: {
                type: 'set',
                data: {
                    id: 'x',
                    value: 'yy',
                },
            },
        },
    }, 'set child');

    t.end();
});

test('map of structs', (t) => {
    const X = new MuRDAMap(
        new MuUTF8(),
        new MuRDAStruct({
            a: new MuRDAConstant(new MuInt32(1)),
            b: new MuRDARegister(new MuFloat64()),
            c: new MuRDAStruct({
                y: new MuRDARegister(new MuFloat64(1)),
            }),
        }));

    const store = X.createStore({
        foo: {
            a: 3,
            b: 2,
            c: {
                y: 666,
            },
        },
    });

    t.same(X.action(store).update('foo').c.y(3), {
        type: 'update',
        data: {
            id: 'foo',
            action: {
                type: 'c',
                data: {
                    type: 'y',
                    data: 3,
                },
            },
        },
    }, 'update map struct');

    t.end();
});

test('map of structs of maps of structs', (t) => {
    const X = new MuRDAMap(new MuUTF8(), new MuRDAStruct({
        props: new MuRDAMap(new MuUTF8(), new MuRDAStruct({
            color: new MuRDARegister(new MuUTF8()),
            weight: new MuRDARegister(new MuFloat64()),
        })),
        foo: new MuRDAConstant(new MuFloat64()),
    }));

    const store = X.createStore({
        'foo': {
            props: {
                'x': {
                    color: 'red',
                    weight: Infinity,
                },
            },
            foo: 1,
        },
        'bar': {
            props: {
                'y': {
                    color: 'blue',
                    weight: 0,
                },
                'z': {
                    color: 'green',
                    weight: 1,
                },
            },
            foo: 1,
        },
    });

    const setG = X.action(store).set('g', {
        props: {
            h: {
                color: '',
                weight: -1,
            },
        },
        foo: -1,
    });
    t.same(setG, {
        type: 'set',
        data: {
            id: 'g',
            value: {
                props: {
                    h: {
                        color: '',
                        weight: -1,
                    },
                },
                foo: -1,
            },
        },
    }, 'set constructor ok');

    const updateSubG = X.action(store).update('foo').props.update('x').color('purple');
    t.same(updateSubG, {
        type: 'update',
        data: {
            id: 'foo',
            action: {
                type: 'props',
                data: {
                    type: 'update',
                    data: {
                        id: 'x',
                        action: {
                            type: 'color',
                            data: 'purple',
                        },
                    },
                },
            },
        },
    });

    t.end();
});

test('list', (t) => {
    t.end();
});