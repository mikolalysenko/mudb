import test = require('tape');
import { MuSystemScheduler  } from '../system';

test('cAF', (t) => {
    t.plan(3);

    function cb1 () { cb1['called'] = true; }
    function cb2 () { cb2['called'] = true; }
    function cb3 () { cb3['called'] = true; }

    MuSystemScheduler.requestAnimationFrame(cb1);
    const handle = MuSystemScheduler.requestAnimationFrame(cb2);
    MuSystemScheduler.requestAnimationFrame(cb3);
    MuSystemScheduler.cancelAnimationFrame(handle);

    MuSystemScheduler.requestAnimationFrame(() => {
        t.true(cb1['called'], 'cb1 was called');
        t.notOk(cb2['called'], 'cb2 was not called');
        t.true(cb3['called'], 'cb3 was called');
        t.end();
    });
});

test('rAF does not eat errors', (t) => {
    function onError () {
        t.pass('error bubbled up');
        t.end();
    }

    if (typeof window !== 'undefined') {
        window.onerror = onError;
    } else if (typeof process !== 'undefined') {
        process.on('uncaughtException', onError);
    }

    MuSystemScheduler.requestAnimationFrame(() => {
        throw new Error('foo');
    });
});
