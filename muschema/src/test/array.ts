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

tape('array', function(t) {
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
    console.log('re-target:', Gplus.patch(g1, patch));

    t.end();
});
