import { MuArray, MuASCII } from '../';
import { deltaByteLength, diffPatchDuration } from './_do';

const array = new MuArray(new MuASCII(), Infinity);

deltaByteLength(array, [], ['a']);
deltaByteLength(array, [], ['a', 'b']);
deltaByteLength(array, [], ['a', 'b', 'c']);
deltaByteLength(array, ['a'], ['a', 'b']);
deltaByteLength(array, ['b'], ['a', 'b']);

deltaByteLength(array, ['a'], []);
deltaByteLength(array, ['a', 'b'], []);
deltaByteLength(array, ['a', 'b'], ['a']);
deltaByteLength(array, ['a', 'b', 'c'], ['a']);

deltaByteLength(array, ['a'], ['b']);
deltaByteLength(array, ['a', 'b'], ['b', 'c']);

const a0 = [];
const a1 = ['a', 'b', 'c', 'd', 'e'];

diffPatchDuration(array, a1, a1, 1e3, 'b=t');

diffPatchDuration(array, a0, a1, 1e3, 'b!=t');
diffPatchDuration(array, a0, a1, 1e4, 'b!=t');
diffPatchDuration(array, a0, a1, 1e5, 'b!=t');
