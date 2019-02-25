// test store construction
// test state accessor

import test = require('tape');
import { MuInt32, MuStruct, MuUTF8, MuInt8, MuFloat64 } from '../../schema';

import { MuRDAConstant } from '../constant';
import { MuRDARegister } from '../register';
import { MuRDAStruct } from '../struct';
import { MuRDAMap } from '../map';
import { MuRDAList } from '../list';

test('constants', (t) => {
    const X = new MuRDAConstant(new MuInt32());

    const a = X.createStore(100);
    t.equals(a.state(X, 0), 100, 'constant construct');

    const as = a.serialize(X, X.storeSchema.alloc());
    const ap = X.parse(as);
    t.same(
        ap.state(X, X.stateSchema.alloc()),
        a.state(X, X.stateSchema.alloc()),
        'serialize -> parse ok');

    const b = X.createStore(-1);
    t.equals(b.state(X, 0), -1, 'construct another constant');

    a.free(X);
    b.free(X);

    t.end();
});

test('registers', (t) => {
    const X = new MuRDARegister(new MuStruct({
        a: new MuInt32(),
        b: new MuFloat64(),
        c: new MuUTF8(),
    }));

    const a = X.createStore({
        a: 1,
        b: -1,
        c: 'foo',
    });

    t.same(a.state(X, X.stateSchema.alloc()), {
        a: 1,
        b: -1,
        c: 'foo',
    }, 'register ok');

    const ap = a.serialize(X, X.storeSchema.alloc());
    const as = X.parse(ap);
    t.same(
        as.state(X, X.stateSchema.alloc()),
        a.state(X, X.stateSchema.alloc()),
        'register serialize -> parse ok');
    t.notEqual(as.value, a.value, 'deserialized stores reference distinct objects');

    const b = X.createStore({
        a: 1000,
        b: 100000,
        c: 'x',
    });

    t.same(b.state(X, X.stateSchema.alloc()), {
        a: 1000,
        b: 100000,
        c: 'x',
    }, 'register ok 2');

    a.free(X);
    b.free(X);
    as.free(X);

    t.end();
});

test('structs', (t) => {
    const X = new MuRDAStruct({
        a: new MuRDAConstant(new MuUTF8()),
        b: new MuRDARegister(new MuUTF8()),
    });

    const a = X.createStore({
        a: 'foo',
        b: 'bar',
    });

    t.same(a.state(X, X.stateSchema.alloc()), {
        a: 'foo',
        b: 'bar',
    }, 'state ok');

    const as = a.serialize(X, X.stateSchema.alloc());
    const ap = X.parse(as);
    t.same(
        ap.state(X, X.stateSchema.alloc()),
        a.state(X, X.stateSchema.alloc()),
        'serialize -> parse ok');

    a.free(X);
    ap.free(X);

    t.end();
});

test('nested structs', (t) => {
    const X = new MuRDAStruct({
        a: new MuRDAConstant(new MuInt8()),

        child: new MuRDAStruct({
            grandchild: new MuRDAStruct({
                data: new MuRDARegister(new MuUTF8()),
            }),
        }),

        sibling: new MuRDAStruct({
            blah: new MuRDARegister(new MuUTF8()),
        }),
    });

    const a = X.createStore({
        a: 10,
        child: {
            grandchild: {
                data: 'x',
            },
        },
        sibling: {
            blah: 'foo',
        },
    });

    t.same(a.state(X, X.stateSchema.alloc()), {
        a: 10,
        child: {
            grandchild: {
                data: 'x',
            },
        },
        sibling: {
            blah: 'foo',
        },
    }, 'nested struct create');

    t.end();
});

test('maps', (t) => {
    const X = new MuRDAMap(new MuUTF8(), new MuRDAStruct({
        x: new MuRDARegister(new MuUTF8()),
    }));

    const a = X.createStore({
        'foo': {
            x: 'bar',
        },
        'y': {
            x: 'z',
        },
    });

    t.same(a.state(X, X.stateSchema.alloc()), {
        'foo': {
            x: 'bar',
        },
        'y': {
            x: 'z',
        },
    });

    const ap = a.serialize(X, X.storeSchema.alloc());
    const as = X.parse(ap);

    t.same(
        as.state(X, X.stateSchema.alloc()),
        a.state(X, X.stateSchema.alloc()));

    t.end();
});

test('map of maps', (t) => {
    // TODO
    t.end();
});

test('map of structs', (t) => {
    // TODO
    t.end();
});

test('map of structs of maps of structs', (t) => {
    // TODO
    t.end();
});

test('lists', (t) => {
    const X = new MuRDAList(new MuRDAStruct({
        a: new MuRDARegister(new MuUTF8()),
        b: new MuRDARegister(new MuFloat64()),
    }));

    const a = X.createStore([]);

    t.same(a.state(X, []), []);

    const b = X.createStore([{
        a: 'foo',
        b: 1,
    }]);

    t.same(b.state(X, X.stateSchema.alloc()), [{
        a: 'foo',
        b: 1,
    }]);

    const bs = b.serialize(X, X.storeSchema.alloc());
    const bp = X.parse(bs);

    t.same(b.ids, bp.ids);
    t.same(b.state(X, X.stateSchema.alloc()), bp.state(X, X.stateSchema.alloc()));

    t.end();
});