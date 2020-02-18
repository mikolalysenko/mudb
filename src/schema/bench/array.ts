import { MuArray, MuASCII } from '../';
import { deltaByteLength, diffPatchDuration } from './_do';

const uint8Array = new MuArray(new MuASCII(), Infinity);

deltaByteLength(uint8Array, [], ['a']);
deltaByteLength(uint8Array, [], ['a', 'b']);
deltaByteLength(uint8Array, [], ['a', 'b', 'c']);
deltaByteLength(uint8Array, ['a'], ['a', 'b']);
deltaByteLength(uint8Array, ['b'], ['a', 'b']);

deltaByteLength(uint8Array, ['a'], []);
deltaByteLength(uint8Array, ['a', 'b'], []);
deltaByteLength(uint8Array, ['a', 'b'], ['a']);
deltaByteLength(uint8Array, ['a', 'b', 'c'], ['a']);

deltaByteLength(uint8Array, ['a'], ['b']);
deltaByteLength(uint8Array, ['a', 'b'], ['b', 'c']);

const a1 = ['a', 'a', 'a', 'a', 'a'];
const a2 = ['b', 'c', 'd', 'e', 'f'];

diffPatchDuration(uint8Array, a1, a1, 1e3);

diffPatchDuration(uint8Array, a1, a2, 1e3);
diffPatchDuration(uint8Array, a1, a2, 1e5);
