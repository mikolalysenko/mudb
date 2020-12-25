import * as tape from 'tape';
import { Id, compareId, allocIds, initialIds, ID_MIN, ID_MAX, searchId } from '../_id';

function idRangeOk (pred:Id, succ:Id, range:Id[]) {
    for (let i = 0; i < range.length; ++i) {
        if (compareId(pred, range[i]) >= 0) {
            return false;
        }
        if (compareId(range[i], succ) >= 0) {
            return false;
        }
        if (i > 0 && compareId(range[i - 1], range[i]) >= 0) {
            return false;
        }
    }
    return true;
}

tape('id initialization', (t) => {
    const N = [
        1,
        2,
        10,
        256,
        65536,
        (1 << 20),
    ];

    N.forEach((n) => {
        const ids = initialIds(n);
        t.ok(
            idRangeOk(ID_MIN, ID_MAX, ids),
            'initialized valid ids');
        t.equals(
            initialIds(n).join(),
            ids.join(),
            'initialization deterministic');
    });

    t.end();
});

tape('id allocate', (t) => {
    function validateInsertion (ids:string[], index:number, count:number) {
        const pred = index > 0 ? ids[index - 1] : ID_MIN;
        const succ = index < ids.length ? ids[index] : ID_MAX;
        const alloc = allocIds(pred, succ, count);
        t.ok(idRangeOk(pred, succ, alloc), 'allocated ids ok');
        ids.splice(index, 0, ...alloc);
        t.ok(idRangeOk(ID_MIN, ID_MAX, ids), 'inserted ids ok');
        return ids;
    }

    for (let i = 0; i < 100; ++i) {
        let ids:Id[] = [];
        for (let j = 0; j < 100; ++j) {
            ids = validateInsertion(ids, Math.floor(Math.random() * (ids.length + 1)), 128);
        }
    }

    validateInsertion(['aaaa', 'baaa'], 1, (1 << 16));

    t.end();
});

function searchBruteForce (ids:Id[], id:Id) {
    for (let i = 0; i < ids.length; ++i) {
        const d = compareId(ids[i], id);
        if (d >= 0) {
            return i;
        }
    }
    return ids.length;
}

tape('id search', (t) => {
    function testSearch (ids:Id[], id:Id, msg:string) {
        t.equals(searchId(ids, id), searchBruteForce(ids, id), msg);
    }

    function testList (ids:Id[]) {
        for (let i = 0; i < ids.length; ++i) {
            testSearch(ids, ids[i], `search element ${i}`);
        }
        testSearch(ids, ID_MIN, 'min');
        testSearch(ids, ID_MAX, 'max');

        const alloc = allocIds(ID_MIN, ID_MAX, 1000);
        for (let i = 0; i < alloc.length; ++i) {
            testSearch(ids, alloc[i], 'random');
        }

        for (let i = 0; i <= ids.length; ++i) {
            allocIds(
                i > 0 ? ids[i - 1] : ID_MIN,
                i < ids.length ? ids[i] : ID_MAX,
                16).forEach((id) => testSearch(ids, id, `range ${i}`));
        }
    }

    testList(['@']);
    testList(['1', '2']);
    testList(['11', '33', '88']);
    testList(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
    testList(initialIds(100));

    t.end();
});