import * as tape from 'tape';
import { MuFloat64, MuArray } from '../../schema';
import { MuRDARegister } from '../index';

tape('constrain - float', (t) => {
    const R = new MuRDARegister(new MuFloat64(), (x) => Math.max(0, Math.min(1, +x || 0)));
    t.equal(R.action(0.1), 0.1);
    t.equal(R.action(-0.1), 0);
    t.equal(R.action(1.1), 1);
    t.equal(R.action(NaN), 0);
    t.end();
});

tape('constrain - array', (t) => {
    const constrain = (a:number[]) => a.map((x) => Math.max(0, Math.min(1, +x || 0)));
    const R = new MuRDARegister(new MuArray(new MuFloat64(), Infinity), constrain);
    t.deepEqual(R.action([]), []);
    t.deepEqual(R.action([NaN, -0.1, 0, 0.1, 0.5, 1, 1.1]), [0, 0, 0, 0.1, 0.5, 1, 1]);
    t.end();
});
