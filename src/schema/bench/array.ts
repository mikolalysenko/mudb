import { MuArray, MuUint8 } from '../';
import { deltaByteLength, diffPatchDuration } from './_do';

const uint8Array = new MuArray(new MuUint8(), Infinity);

deltaByteLength(uint8Array, [], [0]);
deltaByteLength(uint8Array, [], [0, 1]);
deltaByteLength(uint8Array, [], [0, 1, 2]);
deltaByteLength(uint8Array, [0], [0, 1]);
deltaByteLength(uint8Array, [1], [0, 1]);

deltaByteLength(uint8Array, [0], []);
deltaByteLength(uint8Array, [0, 1], []);
deltaByteLength(uint8Array, [0, 1], [0]);
deltaByteLength(uint8Array, [0, 1, 2], [0]);

deltaByteLength(uint8Array, [0], [2]);
deltaByteLength(uint8Array, [0, 1], [1, 2]);

const a1 = [0, 0, 0, 0, 0];
const a2 = [1, 2, 3, 4, 5];

diffPatchDuration(uint8Array, a1, a1, 1e3);

diffPatchDuration(uint8Array, a1, a2, 1e3);
diffPatchDuration(uint8Array, a1, a2, 1e5);
