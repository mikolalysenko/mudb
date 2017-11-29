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
    g2.length = 2;
    g2[0] = 'kagura';
    g2[2] = 'yamasaki';
    console.log('g2', g2);

    const patch = Gplus.diff(g1, g2);
    console.log('patch:', patch);
    const retar = Gplus.patch(g1, patch);
    console.log('re-target:', retar);

    t.same(g2, retar);

    t.end();
});

tape(' ---- array and dict ----', function(t) {
    const schema = new MuStruct({
        x: new MuFloat64(),
        y: new MuFloat64(),
        color: new MuString(),
    });

    const ba = schema.alloc();
    const ta = schema.alloc();
    console.log('ba', ba);
    console.log('ta', ta);

    const patch = schema.diff(ba, ta);
    console.log('patch', patch);
    const retar = schema.patch(ba, patch);
    console.log('re-target', retar);
    t.same(ta, retar);

    t.end();
});

tape(' ---- array and empty ----', function(t) {
    const schema = new MuArray(new MuStruct({
        x: new MuFloat64(),
        y: new MuFloat64(),
        color: new MuString(),
    }));

    type ArrayType = typeof schema.identity;

    const ba:ArrayType = [];
    const ta:ArrayType = [];
    console.log('ba', ba);
    console.log('ta', ta);

    const patch = schema.diff(ba, ta);
    console.log('patch', patch);
    const retar = schema.patch(ba, patch);
    console.log('re-target', retar);

    t.same(ta, retar);

    t.end();
});

tape('number array', function (t) {
    const schema = new MuArray(new MuFloat64());

    function patch (a:number[], b:number[]) {
        const x = schema.diff(a, b);
        if (x) {
            const p = JSON.parse(JSON.stringify(x));
            return schema.patch(a, p);
        }
        return schema.clone(a);
    }

    function testPair (a:number[], b:number[]) {
        t.same(patch(b, a), a, `${b} -> ${a}`);
        t.same(patch(a, b), b, `${a} -> ${b}`);
    }

    function randomArray () {
        const l = (Math.random() * 20) | 0;
        const r = new Array(l);
        for (let i = 0; i < l; ++i) {
            r[i] = (Math.random() * 10) | 0;
        }
        return r;
    }

    for (let i = 0; i < 100; ++i) {
        testPair(randomArray(), randomArray());
    }

    testPair([1, 2, 3], [1, 1]);

    t.end();
});
