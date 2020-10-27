import { vec2, vec3, vec4, quat, mat2, mat3, mat4 } from 'gl-matrix';
import { MuFloat32, MuVector, MuSchema } from './index';
import { MuWriteStream, MuReadStream } from '../stream';

export const MuVec2:MuSchema<vec2> = <any>new MuVector(new MuFloat32(), 2);

const vec3Pool:vec3[] = [];
export const MuVec3:MuSchema<vec3> = {
    muType: 'vector',
    identity: vec3.create(),
    json: {
        type: 'vector',
        data: [0, 0, 0],
    },
    alloc: () => {
        return vec3Pool.pop() || vec3.create();
    },
    free: (v:vec3) => {
        vec3Pool.push(v);
    },
    assign: (dst:vec3, src:vec3) => {
        dst[0] = src[0];
        dst[1] = src[1];
        dst[2] = src[2];
        return dst;
    },
    equal: (dst:vec3, src:vec3) => {
        return (
            dst[0] === src[0] &&
            dst[1] === src[1] &&
            dst[2] === src[2]
        );
    },
    diff: (base:vec3, target:vec3, out:MuWriteStream) => {
        const s0 = <any>(base[0] !== target[0]) << 0;
        const s1 = <any>(base[1] !== target[1]) << 1;
        const s2 = <any>(base[2] !== target[2]) << 2;
        const flags = s0 + s1 + s2;
        if (flags === 0) {
            return false;
        }
        out.grow(13);
        out.writeUint8(flags);
        if (s0) { out.writeFloat32(target[0]); }
        if (s1) { out.writeFloat32(target[1]); }
        if (s2) { out.writeFloat32(target[2]); }
        return true;
    },
    patch: (base:vec3, inp:MuReadStream) => {
        const v = vec3Pool.pop() || vec3.create();
        const flags = inp.readUint8();
        v[0] = (flags & 1) ? inp.readFloat32() : base[0];
        v[1] = (flags & 2) ? inp.readFloat32() : base[1];
        v[2] = (flags & 4) ? inp.readFloat32() : base[2];
        return v;
    },
    clone: (v:vec3) => {
        const x = vec3Pool.pop();
        if (x) {
            x[0] = v[0];
            x[1] = v[1];
            x[2] = v[2];
            return x;
        }
        return vec3.clone(v);
    },
    toJSON: (v:vec3) => [ v[0], v[1], v[2] ],
    fromJSON: (json:any) => {
        let v = vec3Pool.pop();
        if (Array.isArray(json)) {
            v = v || vec3.create();
            v[0] = +json[0] || 0;
            v[1] = +json[1] || 0;
            v[2] = +json[2] || 0;
            return v;
        } else if (v) {
            v[0] = v[1] = v[2] = 0;
            return v;
        } else {
            return vec3.create();
        }
    },
};

const vec4Pool:vec4[] = [];
export const MuVec4:MuSchema<vec4> = {
    muType: 'vector',
    identity: vec4.create(),
    json: {
        type: 'vector',
        data: [0, 0, 0, 0],
    },
    alloc: () => {
        return vec4Pool.pop() || vec4.create();
    },
    free: (v:vec4) => {
        vec4Pool.push(v);
    },
    assign: (dst:vec4, src:vec4) => {
        dst[0] = src[0];
        dst[1] = src[1];
        dst[2] = src[2];
        dst[3] = src[3];
        return dst;
    },
    equal: (dst:vec4, src:vec4) => {
        return (
            dst[0] === src[0] &&
            dst[1] === src[1] &&
            dst[2] === src[2] &&
            dst[3] === src[3]
        );
    },
    diff: (base:vec4, target:vec4, out:MuWriteStream) => {
        const s0 = <any>(base[0] !== target[0]) << 0;
        const s1 = <any>(base[1] !== target[1]) << 1;
        const s2 = <any>(base[2] !== target[2]) << 2;
        const s3 = <any>(base[3] !== target[3]) << 3;
        const flags = s0 + s1 + s2 + s3;
        if (flags === 0) {
            return false;
        }
        out.grow(17);
        out.writeUint8(flags);
        if (s0) { out.writeFloat32(target[0]); }
        if (s1) { out.writeFloat32(target[1]); }
        if (s2) { out.writeFloat32(target[2]); }
        if (s3) { out.writeFloat32(target[3]); }
        return true;
    },
    patch: (base:vec4, inp:MuReadStream) => {
        const v = vec4Pool.pop() || vec4.create();
        const flags = inp.readUint8();
        v[0] = (flags & 1) ? inp.readFloat32() : base[0];
        v[1] = (flags & 2) ? inp.readFloat32() : base[1];
        v[2] = (flags & 4) ? inp.readFloat32() : base[2];
        v[3] = (flags & 8) ? inp.readFloat32() : base[3];
        return v;
    },
    clone: (v:vec4) => {
        const x = vec4Pool.pop();
        if (x) {
            x[0] = v[0];
            x[1] = v[1];
            x[2] = v[2];
            x[3] = v[3];
            return x;
        }
        return vec4.clone(v);
    },
    toJSON: (v:vec4) => [ v[0], v[1], v[2], v[3] ],
    fromJSON: (json:any) => {
        let v = vec4Pool.pop();
        if (Array.isArray(json)) {
            v = v || vec4.create();
            v[0] = +json[0] || 0;
            v[1] = +json[1] || 0;
            v[2] = +json[2] || 0;
            v[3] = +json[3] || 0;
            return v;
        } else if (v) {
            v[0] = v[1] = v[2] = v[3] = 0;
            return v;
        } else {
            return vec4.create();
        }
    },
};

export const MuQuat:MuSchema<quat> = <any>MuVec4;
export const MuMat2:MuSchema<mat2> = <any>MuVec4;
export const MuMat3:MuSchema<mat3> = <any>new MuVector(new MuFloat32(), 9);
export const MuMat4:MuSchema<mat4> = <any>new MuVector(new MuFloat32(), 16);
