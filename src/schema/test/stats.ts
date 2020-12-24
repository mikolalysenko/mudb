import * as test from 'tape';
import { MuWriteStream, MuReadStream } from '../../stream';
import { MuStruct } from '../index';

test('struct.stats()', (t) => {
    t.test('alloc, alloc, free, free', (st) => {
        const struct = new MuStruct({});
        let stats = struct.stats();
        st.equal(stats.allocCount, 0);
        st.equal(stats.freeCount, 0);
        st.equal(stats.poolSize, 0);

        const s1 = struct.alloc();
        stats = struct.stats();
        st.equal(stats.allocCount, 1);
        st.equal(stats.freeCount, 0);
        st.equal(stats.poolSize, 0);

        const s2 = struct.alloc();
        stats = struct.stats();
        st.equal(stats.allocCount, 2);
        st.equal(stats.freeCount, 0);
        st.equal(stats.poolSize, 0);

        struct.free(s1);
        stats = struct.stats();
        st.equal(stats.allocCount, 2);
        st.equal(stats.freeCount, 1);
        st.equal(stats.poolSize, 1);

        struct.free(s2);
        stats = struct.stats();
        st.equal(stats.allocCount, 2);
        st.equal(stats.freeCount, 2);
        st.equal(stats.poolSize, 2);
        st.end();
    });

    t.test('alloc, alloc, free, patch, free', (st) => {
        const struct = new MuStruct({});
        let stats = struct.stats();
        t.equal(stats.allocCount, 0);
        t.equal(stats.freeCount, 0);
        t.equal(stats.poolSize, 0);

        const s1 = struct.alloc();
        const s2 = struct.alloc();
        const out = new MuWriteStream(1);
        struct.diff(s1, s2, out);
        struct.free(s2);
        const inp = new MuReadStream(out.buffer.uint8);
        const s3 = struct.patch(s1, inp);
        stats = struct.stats();
        t.equal(stats.allocCount, 3);
        t.equal(stats.freeCount, 1);
        t.equal(stats.poolSize, 0);

        struct.free(s1);
        stats = struct.stats();
        t.equal(stats.allocCount, 3);
        t.equal(stats.freeCount, 2);
        t.equal(stats.poolSize, 1);
        st.end();
    });

    t.test('alloc, clone', (st) => {
        const struct = new MuStruct({});
        let stats = struct.stats();
        st.equal(stats.allocCount, 0);
        st.equal(stats.freeCount, 0);
        st.equal(stats.poolSize, 0);

        struct.clone(struct.alloc());
        stats = struct.stats();
        st.equal(stats.allocCount, 2);
        st.equal(stats.freeCount, 0);
        st.equal(stats.poolSize, 0);
        st.end();
    });

    t.end();
});
