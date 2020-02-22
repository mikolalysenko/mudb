import { MuStruct, MuUint8, MuVarint, MuRelativeVarint } from '../';
import { deltaByteLength, diffPatchDuration } from './_do';

{
const struct = new MuStruct({
    a: new MuUint8(),
    b: new MuUint8(),
});

deltaByteLength(struct, {a: 0, b: 0}, {a:1, b: 0});
deltaByteLength(struct, {a: 0, b: 0}, {a:1, b: 2});

const s1 = {a: 0, b: 0};
const s2 = {a: 1, b: 2};

diffPatchDuration(struct, s1, s1, 1e3);
diffPatchDuration(struct, s1, s2, 1e3);
diffPatchDuration(struct, s1, s2, 1e4);
diffPatchDuration(struct, s1, s2, 1e5);
}

{
const struct = new MuStruct({
    v: new MuVarint(),
    rv: new MuRelativeVarint(),
});

deltaByteLength(struct, {v: 0, rv: 0}, {v: 0x7f, rv: 0});
deltaByteLength(struct, {v: 0, rv: 0}, {v: 0x80, rv: 0});
deltaByteLength(struct, {v: 0, rv: 0}, {v: 0x80, rv: -0x2a});
deltaByteLength(struct, {v: 0, rv: 0}, {v: 0x80, rv: -0x2b});

const s1 = {v: 0, rv: 0};
const s2 = {v: 0x7f, rv: -0x2a};
const s3 = {v: 0x80, rv: -0x2b};

diffPatchDuration(struct, s1, s1, 1e3);
diffPatchDuration(struct, s1, s2, 1e3);
diffPatchDuration(struct, s1, s2, 1e4);
diffPatchDuration(struct, s1, s2, 1e5);
diffPatchDuration(struct, s1, s3, 1e3);
diffPatchDuration(struct, s1, s3, 1e4);
diffPatchDuration(struct, s1, s3, 1e5);
}
