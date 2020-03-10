import { MuStruct, MuUint8, MuVarint, MuRelativeVarint, MuVector, MuFloat32 } from '../';
import { deltaByteLength, diffPatchDuration } from './_do';

{
const struct = new MuStruct({
    a: new MuUint8(),
    b: new MuUint8(),
});

deltaByteLength(struct, {a: 0, b: 0}, {a:1, b: 0});
deltaByteLength(struct, {a: 0, b: 0}, {a:1, b: 2});

const s0 = {a: 0, b: 0};
const s1 = {a: 1, b: 2};

diffPatchDuration(struct, s1, s1, 1e3, 'uint8 - b=t');
diffPatchDuration(struct, s0, s1, 1e3, 'uint8 - b!=t');
diffPatchDuration(struct, s0, s1, 1e4, 'uint8 - b!=t');
diffPatchDuration(struct, s0, s1, 1e5, 'uint8 - b!=t');
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

const s0 = {v: 0, rv: 0};
const s1 = {v: 0x7f, rv: -0x2a};
const s2 = {v: 0x80, rv: -0x2b};

diffPatchDuration(struct, s1, s1, 1e3, 'varint - b=t');
diffPatchDuration(struct, s0, s1, 1e3, 'varint - one byte');
diffPatchDuration(struct, s0, s1, 1e4, 'varint - one byte');
diffPatchDuration(struct, s0, s1, 1e5, 'varint - one byte');
diffPatchDuration(struct, s0, s2, 1e3, 'varint - two bytes');
diffPatchDuration(struct, s0, s2, 1e4, 'varint - two bytes');
diffPatchDuration(struct, s0, s2, 1e5, 'varint - two bytes');
}

{
const struct = new MuStruct({
    vec2: new MuVector(new MuFloat32(), 2),
    vec3: new MuVector(new MuFloat32(), 3),
});

const s0 = {
    vec2: Float32Array.from([0, 0]),
    vec3: Float32Array.from([0, 0, 0]),
};
const s1 = {
    vec2: Float32Array.from([0.5, 1.5]),
    vec3: Float32Array.from([0.5, 1.5, 2.5]),
};

diffPatchDuration(struct, s0, s0, 1e3, 'vector - b=t');
diffPatchDuration(struct, s0, s1, 1e3, 'vector - b!=t');
diffPatchDuration(struct, s0, s1, 1e4, 'vector - b!=t');
diffPatchDuration(struct, s0, s1, 1e5, 'vector - b!=t');
}
