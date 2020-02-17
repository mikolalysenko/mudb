import { MuVector, MuFloat32 } from '../';
import { deltaByteLength, diffPatchDuration } from './_do';

const vec3 = new MuVector(new MuFloat32(), 3);

const from = (a) => Float32Array.from(a);

deltaByteLength(vec3, from([0, 0, 0]), from([0, 0, 0]));
deltaByteLength(vec3, from([0, 0, 0]), from([1, 0, 0]));
deltaByteLength(vec3, from([0, 0, 0]), from([1, 1, 0]));
deltaByteLength(vec3, from([0, 0, 0]), from([1, 1, 1]));

const v1 = from([0, 0, 0]);
const v2 = from([1, 2, 3]);

diffPatchDuration(vec3, v1, v1, 1);
diffPatchDuration(vec3, v1, v1, 10);
diffPatchDuration(vec3, v1, v1, 100);
diffPatchDuration(vec3, v1, v1, 1e3);

diffPatchDuration(vec3, v1, v2, 1);
diffPatchDuration(vec3, v1, v2, 10);
diffPatchDuration(vec3, v1, v2, 100);
diffPatchDuration(vec3, v1, v2, 1e3);
diffPatchDuration(vec3, v1, v2, 1e4);
diffPatchDuration(vec3, v1, v2, 1e5);
