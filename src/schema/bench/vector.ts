import { MuVector, MuFloat32 } from '../';
import { deltaByteLength, diffPatchDuration } from './_do';

const vec3 = new MuVector(new MuFloat32(), 3);

const from = (a) => Float32Array.from(a);

deltaByteLength(vec3, from([0, 0, 0]), from([0.5, 0.5, 0.5]));
deltaByteLength(vec3, from([0, 0, 0]), from([1.5, 1.5, 1.5]));

const v1 = from([0, 0, 0]);
const v2 = from([0.5, 1, 1.5]);

diffPatchDuration(vec3, v2, v2, 1e3, 'b=t');

diffPatchDuration(vec3, v1, v2, 1e3, 'b!=t');
diffPatchDuration(vec3, v1, v2, 1e4, 'b!=t');
diffPatchDuration(vec3, v1, v2, 1e5, 'b!=t');
