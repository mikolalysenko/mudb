import test = require('tape');
import {
    MuFloat32,
    MuArray,
    MuSortedArray,
    MuVector,
    MuDictionary,
    MuStruct,
    MuUnion,
} from '../index';
import { MuSchemaTrace } from '../trace';

test('schema.free()', (t) => {
    const arrayTrace = new MuSchemaTrace(
        new MuArray(new MuFloat32(), Infinity),
    );
    const array = new MuArray(arrayTrace, Infinity);
    const a = array.alloc();
    a.push(arrayTrace.alloc());
    array.free(a);
    t.equal(arrayTrace.freeCount, 1, 'array schema should call free() on subtype');

    const sortedArrayTrace = new MuSchemaTrace(
        new MuSortedArray(new MuFloat32(), Infinity),
    );
    const sortedArray = new MuSortedArray(sortedArrayTrace, Infinity);
    const sa = sortedArray.alloc();
    sa.push(sortedArrayTrace.alloc());
    sortedArray.free(sa);
    t.equal(sortedArrayTrace.freeCount, 1, 'sorted array schema should call free() on subtype');

    const dictionaryTrace = new MuSchemaTrace(
        new MuDictionary(new MuFloat32(), Infinity),
    );
    const dictionary = new MuDictionary(dictionaryTrace, Infinity);
    const d = dictionary.alloc();
    d.d = dictionaryTrace.alloc();
    dictionary.free(d);
    t.equal(dictionaryTrace.freeCount, 1, 'dictionary schema should call free() on subtype');

    const structTrace = new MuSchemaTrace(
        new MuStruct({ f: new MuFloat32() }),
    );
    const struct = new MuStruct({ s: structTrace });
    const s = struct.alloc();
    struct.free(s);
    t.equal(structTrace.freeCount, 1, 'struct schema should call free() on subtype');

    const vectorTrace = new MuSchemaTrace(
        new MuVector(new MuFloat32(), 3),
    );
    const union = new MuUnion({
        v: vectorTrace,
    }, 'v');
    const u = union.alloc();
    union.free(u);
    t.equal(vectorTrace.freeCount, 1, 'union schema should call free() on subtype');
    t.end();
});
