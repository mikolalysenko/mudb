import test = require('tape');

import { MuInt32, MuStruct, MuFloat64, MuUTF8, MuUint8 } from '../../schema';
import { MuRDAConstant, MuRDARegister, MuRDAList, MuRDAMap, MuRDAStruct } from '../index';

test('store - constant', (t) => {
    const C = new MuRDAConstant(new MuStruct({
        x: new MuInt32(),
        y: new MuInt32(),
    }));
    const o = { x: -123, y: 456 };
    const store = C.createStore(o);
    t.deepEqual(store.state(C, C.stateSchema.alloc()), o, 'construct int32');
    t.isNot(store.state(C, C.stateSchema.alloc()), o, 'should be a copy');

    const serialized = store.serialize(C, C.storeSchema.alloc());
    const storeReplica = C.parse(serialized);
    t.deepEqual(
        storeReplica.state(C, C.stateSchema.alloc()),
        store.state(C, C.stateSchema.alloc()),
        'serialize -> parse',
    );

    const anotherStore = C.createStore(C.stateSchema.alloc());
    store.free(C);
    storeReplica.free(C);
    anotherStore.free(C);
    t.end();
});

test('store - register', (t) => {
    const R = new MuRDARegister(new MuStruct({
        i: new MuInt32(),
        f: new MuFloat64(),
        u: new MuUTF8(),
    }));
    const s = { i: 1, f: -1.11, u: 'Iñtërnâtiônàlizætiøn☃💩' };
    const store = R.createStore(s);
    t.deepEqual(store.state(R, R.stateSchema.alloc()), s, 'construct struct');
    t.isNot(store.state(R, R.stateSchema.alloc()), s, 'should be a copy');

    const serialized = store.serialize(R, R.storeSchema.alloc());
    const storeReplica = R.parse(serialized);
    t.deepEqual(
        storeReplica.state(R, R.stateSchema.alloc()),
        store.state(R, R.stateSchema.alloc()),
        'serialize -> parse',
    );

    const anotherStore = R.createStore(R.stateSchema.alloc());
    store.free(R);
    storeReplica.free(R);
    anotherStore.free(R);
    t.end();
});

test('store - list', (t) => {
    const L = new MuRDAList(new MuRDARegister(
        new MuStruct({
            f: new MuFloat64(),
            i: new MuInt32(),
            u: new MuUTF8(),
        }),
    ));
    const l = [
        { f: -1.11, i: 111, u: 'Iñtërnâtiônàlizætiøn☃💩' },
        { f: -2.22, i: 222, u: 'foo' },
    ];
    const store = L.createStore(l);
    t.deepEqual(store.state(L, []), l, 'construct list');
    t.isNot(store.state(L, []), l, 'should be a copy');

    const anotherStore = L.createStore([]);
    t.deepEqual(anotherStore.state(L, []), [], 'construct empty list');

    const serialized = store.serialize(L, L.storeSchema.alloc());
    const storeReplica = L.parse(serialized);
    t.deepEqual(
        storeReplica.state(L, []),
        store.state(L, []),
        'serialize -> parse',
    );

    store.free(L);
    storeReplica.free(L);
    anotherStore.free(L);
    t.end();
});

test('store - map', (t) => {
    const M = new MuRDAMap(new MuUTF8(), new MuRDARegister(new MuUTF8()));
    const m = { x: 'x', 123: '123', 'Iñtërnâtiônàlizætiøn☃💩': 'Iñtërnâtiônàlizætiøn☃💩' };
    const store = M.createStore(m);
    t.deepEqual(store.state(M, M.stateSchema.alloc()), m, 'construct map');
    t.isNot(store.state(M, M.stateSchema.alloc()), m, 'should be a copy');

    const serialized = store.serialize(M, M.storeSchema.alloc());
    const storeReplica = M.parse(serialized);
    t.deepEqual(
        storeReplica.state(M, M.stateSchema.alloc()),
        store.state(M, M.stateSchema.alloc()),
        'serialize -> parse',
    );

    store.free(M);
    storeReplica.free(M);
    t.end();
});

test('store - struct', (t) => {
    const Role = new MuRDAStruct({
        id: new MuRDAConstant(new MuUTF8()),
        hp: new MuRDARegister(new MuUint8(100)),
        coord: new MuRDAStruct({
            x: new MuRDARegister(new MuFloat64()),
            y: new MuRDARegister(new MuFloat64()),
        }),
        ability: new MuRDAStruct({
            id: new MuRDAConstant(new MuUint8()),
            name: new MuRDAConstant(new MuUTF8()),
        }),
    });
    const r = {
        id: 'invisible assassin',
        hp: 1,
        coord: { x: 1.111, y: -2.222 },
        ability: { id: 123, name: 'stealth' },
    };
    const store = Role.createStore(r);
    t.deepEqual(store.state(Role, Role.stateSchema.alloc()), r, 'construct struct');
    t.isNot(store.state(Role, Role.stateSchema.alloc()), r, 'should be a copy');

    const serialized = store.serialize(Role, Role.storeSchema.alloc());
    const storeReplica = Role.parse(serialized);
    t.deepEqual(
        storeReplica.state(Role, Role.stateSchema.alloc()),
        store.state(Role, Role.stateSchema.alloc()),
        'serialize -> parse',
    );

    store.free(Role);
    storeReplica.free(Role);
    t.end();
});

test('store - list of structs', (t) => {
    const L = new MuRDAList(new MuRDAStruct({
        f: new MuRDARegister(new MuFloat64()),
        i: new MuRDARegister(new MuInt32()),
        u: new MuRDARegister(new MuUTF8()),
    }));
    const l = [
        { f: -1.11, i: 111, u: 'Iñtërnâtiônàlizætiøn☃💩' },
        { f: -2.22, i: 222, u: 'foo' },
    ];
    const store = L.createStore(l);
    t.deepEqual(store.state(L, []), l, 'construct list');
    t.isNot(store.state(L, []), l, 'should be a copy');

    const anotherStore = L.createStore([]);
    t.deepEqual(anotherStore.state(L, []), [], 'construct empty list');

    const serialized = store.serialize(L, L.storeSchema.alloc());
    const storeReplica = L.parse(serialized);
    t.deepEqual(
        storeReplica.state(L, []),
        store.state(L, []),
        'serialize -> parse',
    );

    store.free(L);
    storeReplica.free(L);
    anotherStore.free(L);
    t.end();
});

test('store - list of structs of struct', (t) => {
    const PuzzlePiece = new MuRDAStruct({
        color: new MuRDARegister(new MuUTF8()),
        position: new MuRDAStruct({
            x: new MuRDARegister(new MuFloat64(0)),
            y: new MuRDARegister(new MuFloat64(0)),
        }),
        rotation: new MuRDARegister(new MuFloat64(0)),
    });

    const Puzzle = new MuRDAList(PuzzlePiece);

    const store = Puzzle.createStore([
        {
            color: 'red',
            position: { x: 0, y: 0 },
            rotation: 0,
        },
        {
            color: 'green',
            position: { x: 100, y: 0 },
            rotation: 0,
        },
        {
            color: 'blue',
            position: { x: 0, y: 100 },
            rotation: 0,
        },
        {
            color: 'yellow',
            position: { x: 100, y: 100 },
            rotation: 0,
        },
    ]);

    const serialized = store.serialize(Puzzle, Puzzle.storeSchema.alloc());
    const storeReplica = Puzzle.parse(serialized);
    t.deepEqual(storeReplica.state(Puzzle, Puzzle.stateSchema.alloc()), [
        {
            color: 'red',
            position: { x: 0, y: 0 },
            rotation: 0,
        },
        {
            color: 'green',
            position: { x: 100, y: 0 },
            rotation: 0,
        },
        {
            color: 'blue',
            position: { x: 0, y: 100 },
            rotation: 0,
        },
        {
            color: 'yellow',
            position: { x: 100, y: 100 },
            rotation: 0,
        },
    ], 'puzzle schema serialize');

    t.end();
});

test('store - map of maps', (t) => {
    const M = new MuRDAMap(
        new MuUTF8(),
        new MuRDAMap(new MuUTF8(), new MuRDARegister(new MuUTF8())),
    );
    const store = M.createStore({
        x: { x: 'Iñtërnâtiônàlizætiøn☃💩', 123: 'Iñtërnâtiônàlizætiøn☃💩', '': 'Iñtërnâtiônàlizætiøn☃💩' },
        123: { 123: 'Iñtërnâtiônàlizætiøn☃💩', '': 'Iñtërnâtiônàlizætiøn☃💩' },
        'Iñtërnâtiônàlizætiøn☃💩': { 123: 'Iñtërnâtiônàlizætiøn☃💩' },
        '': { },
    });
    t.deepEqual(store.state(M, M.stateSchema.alloc()), {
        x: { x: 'Iñtërnâtiônàlizætiøn☃💩', 123: 'Iñtërnâtiônàlizætiøn☃💩', '': 'Iñtërnâtiônàlizætiøn☃💩' },
        123: { 123: 'Iñtërnâtiônàlizætiøn☃💩', '': 'Iñtërnâtiônàlizætiøn☃💩' },
        'Iñtërnâtiônàlizætiøn☃💩': { 123: 'Iñtërnâtiônàlizætiøn☃💩' },
        '': { },
    }, 'construct map');

    const serialized = store.serialize(M, M.storeSchema.alloc());
    const storeReplica = M.parse(serialized);
    t.deepEqual(
        storeReplica.state(M, M.stateSchema.alloc()),
        store.state(M, M.stateSchema.alloc()),
        'serialize -> parse',
    );

    store.free(M);
    storeReplica.free(M);
    t.end();
});

test('store - map of structs', (t) => {
    const M = new MuRDAMap(new MuUTF8(), new MuRDAStruct({
        i: new MuRDARegister(new MuInt32()),
        f: new MuRDARegister(new MuFloat64()),
        u: new MuRDARegister(new MuUTF8()),
    }));
    const store = M.createStore({
        x: { i: -1, f: 1.11, u: 'x' },
        123: { i: -2, f: 2.22, u: '123' },
        'Iñtërnâtiônàlizætiøn☃💩': { i: -3, f: 3.33, u: 'Iñtërnâtiônàlizætiøn☃💩' },
    });
    t.deepEqual(store.state(M, M.stateSchema.alloc()), {
        x: { i: -1, f: 1.11, u: 'x' },
        123: { i: -2, f: 2.22, u: '123' },
        'Iñtërnâtiônàlizætiøn☃💩': { i: -3, f: 3.33, u: 'Iñtërnâtiônàlizætiøn☃💩' },
    }, 'construct map');

    const serialized = store.serialize(M, M.storeSchema.alloc());
    const storeReplica = M.parse(serialized);
    t.deepEqual(
        storeReplica.state(M, M.stateSchema.alloc()),
        store.state(M, M.stateSchema.alloc()),
        'serialize -> parse',
    );

    store.free(M);
    storeReplica.free(M);
    t.end();
});

test('store - map of structs of struct', (t) => {
    const PuzzlePiece = new MuRDAStruct({
        color: new MuRDARegister(new MuUTF8()),
        position: new MuRDAStruct({
            x: new MuRDARegister(new MuFloat64(0)),
            y: new MuRDARegister(new MuFloat64(0)),
        }),
        rotation: new MuRDARegister(new MuFloat64(0)),
    });

    const Puzzle = new MuRDAMap(new MuUTF8(), PuzzlePiece);

    const store = Puzzle.createStore({
        'red':{
            color: 'red',
            position: { x: 0, y: 0 },
            rotation: 0,
        },
        'green':{
            color: 'green',
            position: { x: 100, y: 0 },
            rotation: 0,
        },
        'blue':{
            color: 'blue',
            position: { x: 0, y: 100 },
            rotation: 0,
        },
        'yellow':{
            color: 'yellow',
            position: { x: 100, y: 100 },
            rotation: 0,
        },
    });

    const serialized = store.serialize(Puzzle, Puzzle.storeSchema.alloc());
    const storeReplica = Puzzle.parse(serialized);
    t.deepEqual(storeReplica.state(Puzzle, Puzzle.stateSchema.alloc()), {
        'red':{
            color: 'red',
            position: { x: 0, y: 0 },
            rotation: 0,
        },
        'green':{
            color: 'green',
            position: { x: 100, y: 0 },
            rotation: 0,
        },
        'blue':{
            color: 'blue',
            position: { x: 0, y: 100 },
            rotation: 0,
        },
        'yellow':{
            color: 'yellow',
            position: { x: 100, y: 100 },
            rotation: 0,
        },
    }, 'puzzle schema serialize');

    t.end();
});

test('store - map of structs of map of structs', (t) => {
    const M = new MuRDAMap(new MuUTF8(), new MuRDAStruct({
        m: new MuRDAMap(new MuUTF8(), new MuRDAStruct({
            i: new MuRDARegister(new MuInt32()),
            f: new MuRDARegister(new MuFloat64()),
            u: new MuRDARegister(new MuUTF8()),
        })),
    }));
    const store = M.createStore({
        '': { m: { } },
        x: { m: { x: { i: -1, f: 1.11, u: 'x' } } },
        123: { m: { x: { i: -1, f: 1.11, u: 'x' }, 123: { i: -2, f: 2.22, u: '123' } } },
    });
    t.deepEqual(store.state(M, M.stateSchema.alloc()), {
        '': { m: { } },
        x: { m: { x: { i: -1, f: 1.11, u: 'x' } } },
        123: { m: { x: { i: -1, f: 1.11, u: 'x' }, 123: { i: -2, f: 2.22, u: '123' } } },
    }, 'construct map');

    const serialized = store.serialize(M, M.storeSchema.alloc());
    const storeReplica = M.parse(serialized);
    t.deepEqual(
        storeReplica.state(M, M.stateSchema.alloc()),
        store.state(M, M.stateSchema.alloc()),
        'serialize -> parse',
    );

    store.free(M);
    storeReplica.free(M);
    t.end();
});
