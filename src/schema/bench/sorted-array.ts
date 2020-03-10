import { MuSortedArray, MuUint8 } from '../';
import { deltaByteLength, diffPatchDuration } from './_do';

const uint8SortedArray = new MuSortedArray(new MuUint8(), Infinity);

deltaByteLength(uint8SortedArray, [], []);
deltaByteLength(uint8SortedArray, [0], [0]);

deltaByteLength(uint8SortedArray, [], [0]);
deltaByteLength(uint8SortedArray, [], [0, 1]);
deltaByteLength(uint8SortedArray, [], [0, 1, 2]);
deltaByteLength(uint8SortedArray, [0], [0, 1]);
deltaByteLength(uint8SortedArray, [1], [0, 1]);

deltaByteLength(uint8SortedArray, [0], []);
deltaByteLength(uint8SortedArray, [0, 1], []);
deltaByteLength(uint8SortedArray, [0, 1], [0]);
deltaByteLength(uint8SortedArray, [0, 1, 2], [0]);

deltaByteLength(uint8SortedArray, [0], [1]);
deltaByteLength(uint8SortedArray, [0, 1], [1, 2]);

const a1 = [0, 1, 2, 4, 5];
const a2 = [1, 3, 5, 7, 9];

diffPatchDuration(uint8SortedArray, a1, a1, 1e3, 'b=t');

diffPatchDuration(uint8SortedArray, a1, a2, 1e3, 'b!=t');
diffPatchDuration(uint8SortedArray, a1, a2, 1e4, 'b!=t');
diffPatchDuration(uint8SortedArray, a1, a2, 1e5, 'b!=t');
