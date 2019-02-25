import test = require('tape');
import { MuInt32, MuStruct, MuUTF8, MuInt8, MuFloat64, MuSchema } from '../../schema';

import { MuRDARegister } from '../register';
import { MuRDAStruct } from '../struct';
import { MuRDAMap } from '../map';
import { MuRDAList } from '../list';
import { MuRDAStore, MuRDA, MuRDATypes } from '../rda';

function testInverse<
    RDA extends MuRDA<any, any, any, any>,
    Store extends MuRDAStore<RDA>> (t, store:Store, rda:RDA, action:MuRDATypes<RDA>['action'], msg:string) {
    const origin = store.state(rda, rda.stateSchema.alloc());
    const inverse = store.inverse(rda, action);
    store.apply(rda, action);
    store.apply(rda, inverse);
    t.same(store.state(rda, rda.stateSchema.alloc()), origin, msg);
}

// test inverse of actions for stores
test('register inverse', (t) => {
    const X = new MuRDARegister(new MuFloat64());

    const a = X.createStore(0);

    testInverse(t, a, X, X.action(1), 'set 1');
    testInverse(t, a, X, X.action(-1), 'set -1');

    t.end();
});

test('struct inverse', (t) => {
    const X = new MuRDAStruct({
        a: new MuRDARegister(new MuUTF8()),
        b: new MuRDARegister(new MuUTF8()),
    });

    const store = X.createStore({
        a: 'foo',
        b: 'bar',
    });

    testInverse(t, store, X, X.action(store).a('1'), 'set a');
    testInverse(t, store, X, X.action(store).b(''), 'set b');

    t.end();
});

test('nested struct inverse', (t) => {
    const X = new MuRDAStruct({
        a: new MuRDARegister(new MuUTF8()),
        b: new MuRDAStruct({
            c: new MuRDARegister(new MuFloat64()),
        }),
    });

    const store = X.createStore({
        a: 'foo',
        b: {
            c: 0,
        },
    });

    testInverse(t, store, X, X.action(store).a('bar'), 'set a');
    testInverse(t, store, X, X.action(store).b.c(100), 'set b.c');

    t.end();
});

test('map inverse', (t) => {
    const X = new MuRDAMap(new MuUTF8(), new MuRDARegister(new MuUTF8()));

    //TODO test inverse of each action type

    t.end();
});

test('map of map inverse', (t) => {
    const X = new MuRDAMap(new MuUTF8(), new MuRDAMap(new MuUTF8(), new MuRDARegister(new MuUTF8())));

    // TODO

    t.end();
});

test('list', (t) => {

    // TODO test inverse of each action type

    t.end();
});