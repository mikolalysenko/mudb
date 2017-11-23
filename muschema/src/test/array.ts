import tape = require('tape');
import {
    MuStruct,
    MuBoolean,
    MuFloat32,
    MuFloat64,
    MuUint8,
    MuUint16,
    MuInt32,
    MuString,
    MuUnion,
    MuDictionary,
    MuArray,
  } from '../index';

tape('---- array and base types ----', function(t) {
    const Gplus = new MuArray(
        new MuString('name'),
        ['gintama', 'haruka'],
    );

    const g1 = Gplus.alloc();
    console.log('Gplus', Gplus);
    console.log('g', g1);

    const g2 = Gplus.clone(g1);
    g2[0] = 'kagura';
    g2[2] = 'yamasaki';
    // g2.pop();
    console.log('g2', g2);

    const patch = Gplus.diff(g1, g2);
    console.log('patch:', patch);
    const retar = Gplus.patch(g1, patch);
    console.log('re-target:', retar);

    t.end();
});

tape(' ---- array and dict ----', function(t) {
    const commmonSchema = new MuStruct({
        x: new MuFloat64(),
        y: new MuFloat64(),
        color: new MuString(),
    });

    const base = new MuArray(
        commmonSchema,
        [{x: 345, y: 202.25, color: 'red'},
        {x: 397, y: 315, color: 'blue'}],
    );

    const target = new MuArray(
        commmonSchema,
        [{x:345, y:202, color: 'red'},
        {x:398, y:315, color: 'blue'}],
    );

    const ba = base.alloc();
    const ta = target.alloc();
    console.log('ba', ba);
    console.log('ta', ta);

    const patch = base.diff(ba, ta);
    console.log('patch', patch);
    const retar = base.patch(ba, patch);
    console.log('re-target', retar);

    t.end();
});

tape(' ---- array and empty ----', function(t) {
    const commmonSchema = new MuStruct({
        x: new MuFloat64(),
        y: new MuFloat64(),
        color: new MuString(),
    });

    const base = new MuArray(
        commmonSchema,
        [],
    );

    const target = new MuArray(
        commmonSchema,
        [{x:345, y:202, color: 'red'},
        {x:398, y:315, color: 'blue'}],
    );

    const ba = base.alloc();
    const ta = target.alloc();
    console.log('ba', ba);
    console.log('ta', ta);

    const patch = base.diff(ba, ta);
    console.log('patch', patch);
    const retar = base.patch(ba, patch);
    console.log('re-target', retar);

    t.end();
});
