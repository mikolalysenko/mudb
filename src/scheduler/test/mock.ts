import * as test from 'tape';
import { MuMockScheduler } from '../mock';

test('FIFO', (t) => {
    const scheduler = new MuMockScheduler();
    const st = scheduler.setTimeout;

    function cb1 () { cb1['called'] = true; }
    function cb2 () { cb2['called'] = true; }
    function cb3 () { cb3['called'] = true; }

    st(cb1, 0);
    st(cb2, 0);
    st(cb3, 0);

    scheduler.poll();
    t.ok(cb1['called'], 'after first poll');
    t.notOk(cb2['called'], 'after first poll');
    t.notOk(cb3['called'], 'after first poll');

    scheduler.poll();
    t.ok(cb2['called'], 'after second poll');
    t.notOk(cb3['called'], 'after second poll');

    scheduler.poll();
    t.ok(cb3['called'], 'after third poll');

    t.end();
});

test('smaller, earlier', (t) => {
    const scheduler = new MuMockScheduler();
    const st = scheduler.setTimeout;

    function cb1 () { cb1['called'] = true; }
    function cb2 () { cb2['called'] = true; }
    function cb3 () { cb3['called'] = true; }

    st(cb1, 2);
    st(cb2, 1);
    st(cb3, 0);

    scheduler.poll();
    t.notOk(cb1['called'], 'after fist poll');
    t.notOk(cb2['called'], 'after fist poll');
    t.ok(cb3['called'], 'after fist poll');

    scheduler.poll();
    t.notOk(cb1['called'], 'after second poll');
    t.ok(cb2['called'], 'after second poll');

    scheduler.poll();
    t.ok(cb1['called'], 'after third poll');

    t.end();
});

test('setting clock', (t) => {
    const scheduler = new MuMockScheduler();
    const st = scheduler.setTimeout;

    let c1 = 0;
    let c2 = 0;

    function cb1 () {
        if (c1 === 0) {
            ++c1;
            st(cb1, 0);
            return;
        }
        ++c1;
    }

    function cb2 () {
        if (c2 === 0) {
            ++c2;
            st(cb2, 1);
            return;
        }
        ++c2;
    }

    st(cb1, 2);
    st(cb2, 1);

    scheduler.poll();
    t.equal(c1, 0, 'after first poll');
    t.equal(c2, 1, 'after first poll');

    scheduler.poll();
    t.equal(c1, 1, 'after second poll');
    t.equal(c2, 1, 'after second poll');

    scheduler.poll();
    t.equal(c1, 1, 'after third poll');
    t.equal(c2, 2, 'after third poll');

    scheduler.poll();
    t.equal(c1, 2, 'after fourth poll');
    t.equal(c2, 2, 'after fourth poll');
    t.end();
});

test('setInterval', (t) => {
    const scheduler = new MuMockScheduler();
    const si = scheduler.setInterval;

    let c1 = 0;
    let c2 = 0;
    let c3 = 0;

    function cb1 () { ++c1; }
    function cb2 () { ++c2; }
    function cb3 () { ++c3; }

    si(cb1, 1);
    si(cb2, 1);
    si(cb3, 4);

    scheduler.poll();
    t.equal(c1, 1, 'after first poll');
    t.equal(c2, 0, 'after first poll');
    t.equal(c3, 0, 'after first poll');

    scheduler.poll();
    t.equal(c1, 1, 'after second poll');
    t.equal(c2, 1, 'after second poll');
    t.equal(c3, 0, 'after second poll');

    scheduler.poll();
    t.equal(c1, 2, 'after third poll');
    t.equal(c2, 1, 'after third poll');
    t.equal(c3, 0, 'after third poll');

    scheduler.poll();
    t.equal(c1, 2, 'after fourth poll');
    t.equal(c2, 2, 'after fourth poll');
    t.equal(c3, 0, 'after fourth poll');

    scheduler.poll();
    t.equal(c1, 2, 'after fifth poll');
    t.equal(c2, 2, 'after fifth poll');
    t.equal(c3, 1, 'after fifth poll');

    t.end();
});
