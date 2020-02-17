import { MuStruct, MuUint8 } from '../';
import { deltaByteLength, diffPatchDuration } from './_do';

const struct = new MuStruct({
    a: new MuUint8(),
    b: new MuUint8(),
    c: new MuUint8(),
});

deltaByteLength(struct, {a: 0, b: 0, c: 0}, {a: 0, b: 0, c: 0});
deltaByteLength(struct, {a: 0, b: 0, c: 0}, {a: 1, b: 0, c: 0});
deltaByteLength(struct, {a: 0, b: 0, c: 0}, {a: 1, b: 1, c: 0});
deltaByteLength(struct, {a: 0, b: 0, c: 0}, {a: 1, b: 1, c: 1});

const s1 = {a: 0, b: 0, c: 0};
const s2 = {a: 1, b: 2, c: 3};

diffPatchDuration(struct, s1, s1, 1);
diffPatchDuration(struct, s1, s1, 10);
diffPatchDuration(struct, s1, s1, 100);
diffPatchDuration(struct, s1, s1, 1e3);

diffPatchDuration(struct, s1, s2, 10);
diffPatchDuration(struct, s1, s2, 100);
diffPatchDuration(struct, s1, s2, 1e3);
diffPatchDuration(struct, s1, s2, 1e4);
diffPatchDuration(struct, s1, s2, 1e5);
