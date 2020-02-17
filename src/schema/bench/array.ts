import { MuArray, MuUint8 } from '../';
import { deltaByteLength, diffPatchDuration } from './_do';

const uint8Array = new MuArray(new MuUint8(), Infinity);

deltaByteLength(uint8Array, [], []);
deltaByteLength(uint8Array, [1], [1]);

deltaByteLength(uint8Array, [], [1]);
deltaByteLength(uint8Array, [], [1, 2]);
deltaByteLength(uint8Array, [], [1, 2, 3]);
deltaByteLength(uint8Array, [1], [1, 2]);
deltaByteLength(uint8Array, [2], [1, 2]);

deltaByteLength(uint8Array, [1], []);
deltaByteLength(uint8Array, [1, 2], []);
deltaByteLength(uint8Array, [1, 2], [1]);
deltaByteLength(uint8Array, [1, 2, 3], [1]);

deltaByteLength(uint8Array, [1], [2]);
deltaByteLength(uint8Array, [1, 2], [2, 1]);

const a1 = [1, 1, 1, 1, 1];
const a2 = [2, 2, 2, 2, 2];

diffPatchDuration(uint8Array, a1, a2, 1);
diffPatchDuration(uint8Array, a1, a2, 10);
diffPatchDuration(uint8Array, a1, a2, 100);
diffPatchDuration(uint8Array, a1, a2, 1000);
diffPatchDuration(uint8Array, a1, a2, 1e4);
diffPatchDuration(uint8Array, a1, a2, 1e5);
