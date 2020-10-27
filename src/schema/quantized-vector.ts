import { vec2, vec3, vec4 } from 'gl-matrix';
import { MuWriteStream, MuReadStream } from '../stream';
import { MuSchema } from './schema';
import { MuVec2, MuVec3, MuVec4 } from './math';

const SCHROEPPEL2 = 0xAAAAAAAA;

function readShroeppel (stream:MuReadStream) {
    const x = stream.readVarint();
    return ((SCHROEPPEL2 ^ x) - SCHROEPPEL2) >> 0;
}

function writeVarIntWithPrefix2 (code:number, x:number, stream:MuWriteStream) {
    const x0 = x & 31;
    const x1 = x >>> 5;
    const prefix = code | (x1 ? 4 : 0);
    stream.writeUint8((prefix << 5) | x0);
    if (x1) {
        stream.writeVarint(x1);
    }
}

function readShroeppelWithPrefix2 (prefix:number, stream:MuReadStream) {
    let x = prefix & 31;
    if (prefix & 128) {
        x += stream.readVarint() << 5;
    }
    return (SCHROEPPEL2 ^ x) - SCHROEPPEL2 >> 0;
}

export class MuQuantizedVec2 implements MuSchema<vec2> {
    public invPrecision = 1;
    public identity = vec2.create();
    public json:{
        type:'quantized-vec2';
        precision:number;
        identity:number[];
    };
    public muData:{
        type:'quantized-vec2';
        precision:number;
        identity:number[];
    } = {
        type: 'quantized-vec2',
        precision: 0,
        identity: [0, 0],
    };
    public readonly muType = 'quantized-vec2';

    constructor (
        public precision:number,
        identity?:vec2) {
        this.invPrecision = 1 / this.precision;
        if (identity) {
            this.identity[0] = this.precision * (Math.round(this.invPrecision * identity[0]) >> 0);
            this.identity[1] = this.precision * (Math.round(this.invPrecision * identity[1]) >> 0);
        }
        this.json = this.muData = {
            type: 'quantized-vec2',
            precision: this.precision,
            identity: [this.identity[0], this.identity[1]],
        };
    }

    public assign(x:vec2, y:vec2) {
        const ip = this.invPrecision;
        const p = this.precision;
        x[0] = (Math.round(ip * y[0]) >> 0) * p;
        x[1] = (Math.round(ip * y[1]) >> 0) * p;
        return x;
    }

    public clone (x:vec2) {
        const r = MuVec2.alloc();
        return this.assign(r, x);
    }

    public alloc () {
        return MuVec2.alloc();
    }

    public free (x:vec2) {
        return MuVec2.free(x);
    }

    public toJSON (x:vec2) {
        return [
            this.precision * (Math.round(this.invPrecision * x[0]) >> 0),
            this.precision * (Math.round(this.invPrecision * x[1]) >> 0),
        ];
    }

    public fromJSON (x:any) {
        if (Array.isArray(x) && x.length === 2 && typeof x[0] === 'number' && typeof x[1] === 'number') {
            return this.clone(<any>(x));
        }
        return MuVec2.clone(this.identity);
    }

    public equal (x:vec2, y:vec2) {
        const sf = this.invPrecision;
        return (
            (Math.round(sf * x[0]) >> 0) === (Math.round(sf * y[0]) >> 0) &&
            (Math.round(sf * x[1]) >> 0) === (Math.round(sf * y[1]) >> 0)
        );
    }

    public diff (base:vec2, target:vec2, stream:MuWriteStream) {
        const sf = this.invPrecision;
        const bx = Math.round(sf * base[0]) >> 0;
        const by = Math.round(sf * base[1]) >> 0;
        const tx = Math.round(sf * target[0]) >> 0;
        const ty = Math.round(sf * target[1]) >> 0;

        if (bx === tx && by === ty) {
            return false;
        }
        const dx = (SCHROEPPEL2 + (tx - bx) ^ SCHROEPPEL2) >>> 0;
        const dy = (SCHROEPPEL2 + (ty - by) ^ SCHROEPPEL2) >>> 0;

        const code =
            (dx ? 1 : 0) |
            (dy ? 2 : 0);

        stream.grow(16);
        if (dx) {
            writeVarIntWithPrefix2(code, dx, stream);
            dy && stream.writeVarint(dy);
        } else {
            writeVarIntWithPrefix2(code, dy, stream);
        }

        return true;
    }

    public patch (base:vec2, stream:MuReadStream) {
        const prefix = stream.readUint8();

        let dx = 0;
        let dy = 0;
        if (prefix & 32) {
            dx = readShroeppelWithPrefix2(prefix, stream);
            (prefix & 64) && (dy = readShroeppel(stream));
        } else {
            dy = readShroeppelWithPrefix2(prefix, stream);
        }

        const result = MuVec2.alloc();
        const ip = this.invPrecision;
        const p = this.precision;

        const bx = Math.round(ip * base[0]) >> 0;
        const by = Math.round(ip * base[1]) >> 0;

        result[0] = p * (bx + dx);
        result[1] = p * (by + dy);

        return result;
    }
}

function writeVarIntWithPrefix3 (code:number, x:number, stream:MuWriteStream) {
    const x0 = x & 15;
    const x1 = x >>> 4;
    const prefix = code | (x1 ? 8 : 0);
    stream.writeUint8((prefix << 4) | x0);
    if (x1) {
        stream.writeVarint(x1);
    }
}

function readShroeppelWithPrefix3 (prefix:number, stream:MuReadStream) {
    let x = prefix & 15;
    if (prefix & 128) {
        x += stream.readVarint() << 4;
    }
    return (SCHROEPPEL2 ^ x) - SCHROEPPEL2 >> 0;
}

export class MuQuantizedVec3 implements MuSchema<vec3> {
    public invPrecision = 1;
    public identity = vec3.create();
    public json:{
        type:'quantized-vec3';
        precision:number;
        identity:number[];
    };
    public muData:{
        type:'quantized-vec3';
        precision:number;
        identity:number[];
    } = {
        type: 'quantized-vec3',
        precision: 0,
        identity: [0, 0, 0],
    };
    public readonly muType = 'quantized-vec3';

    constructor (
        public precision:number,
        identity?:vec3) {
        this.invPrecision = 1 / this.precision;
        if (identity) {
            this.identity[0] = this.precision * (Math.round(this.invPrecision * identity[0]) >> 0);
            this.identity[1] = this.precision * (Math.round(this.invPrecision * identity[1]) >> 0);
            this.identity[2] = this.precision * (Math.round(this.invPrecision * identity[2]) >> 0);
        }
        this.json = this.muData = {
            type: 'quantized-vec3',
            precision: this.precision,
            identity: [this.identity[0], this.identity[1], this.identity[2]],
        };
    }

    public assign(x:vec3, y:vec3) {
        const ip = this.invPrecision;
        const p = this.precision;
        x[0] = (Math.round(ip * y[0]) >> 0) * p;
        x[1] = (Math.round(ip * y[1]) >> 0) * p;
        x[2] = (Math.round(ip * y[2]) >> 0) * p;
        return x;
    }

    public clone (x:vec3) {
        const r = MuVec3.alloc();
        return this.assign(r, x);
    }

    public alloc () {
        return MuVec3.alloc();
    }

    public free (x:vec3) {
        return MuVec3.free(x);
    }

    public toJSON (x:vec3) {
        return [
            this.precision * (Math.round(this.invPrecision * x[0]) >> 0),
            this.precision * (Math.round(this.invPrecision * x[1]) >> 0),
            this.precision * (Math.round(this.invPrecision * x[2]) >> 0),
        ];
    }

    public fromJSON (x:any) {
        if (Array.isArray(x) && x.length === 3 && typeof x[0] === 'number' && typeof x[1] === 'number' && typeof x[2] === 'number') {
            return this.clone(<any>(x));
        }
        return MuVec3.clone(this.identity);
    }

    public equal (x:vec3, y:vec3) {
        const sf = this.invPrecision;
        return (
            (Math.round(sf * x[0]) >> 0) === (Math.round(sf * y[0]) >> 0) &&
            (Math.round(sf * x[1]) >> 0) === (Math.round(sf * y[1]) >> 0) &&
            (Math.round(sf * x[2]) >> 0) === (Math.round(sf * y[2]) >> 0)
        );
    }

    public diff (base:vec3, target:vec3, stream:MuWriteStream) {
        const sf = this.invPrecision;
        const bx = Math.round(sf * base[0]) >> 0;
        const by = Math.round(sf * base[1]) >> 0;
        const bz = Math.round(sf * base[2]) >> 0;
        const tx = Math.round(sf * target[0]) >> 0;
        const ty = Math.round(sf * target[1]) >> 0;
        const tz = Math.round(sf * target[2]) >> 0;

        if (bx === tx && by === ty && bz === tz) {
            return false;
        }
        const dx = (SCHROEPPEL2 + (tx - bx) ^ SCHROEPPEL2) >>> 0;
        const dy = (SCHROEPPEL2 + (ty - by) ^ SCHROEPPEL2) >>> 0;
        const dz = (SCHROEPPEL2 + (tz - bz) ^ SCHROEPPEL2) >>> 0;

        const code =
            (dx ? 1 : 0) |
            (dy ? 2 : 0) |
            (dz ? 4 : 0);

        stream.grow(16);
        if (dx) {
            writeVarIntWithPrefix3(code, dx, stream);
            dy && stream.writeVarint(dy);
            dz && stream.writeVarint(dz);
        } else if (dy) {
            writeVarIntWithPrefix3(code, dy, stream);
            dz && stream.writeVarint(dz);
        } else {
            writeVarIntWithPrefix3(code, dz, stream);
        }

        return true;
    }

    public patch (base:vec3, stream:MuReadStream) {
        const prefix = stream.readUint8();

        let dx = 0;
        let dy = 0;
        let dz = 0;
        if (prefix & 16) {
            dx = readShroeppelWithPrefix3(prefix, stream);
            (prefix & 32) && (dy = readShroeppel(stream));
            (prefix & 64) && (dz = readShroeppel(stream));
        } else if (prefix & 32) {
            dy = readShroeppelWithPrefix3(prefix, stream);
            (prefix & 64) && (dz = readShroeppel(stream));
        } else {
            dz = readShroeppelWithPrefix3(prefix, stream);
        }

        const result = MuVec3.alloc();
        const ip = this.invPrecision;
        const p = this.precision;

        const bx = Math.round(ip * base[0]) >> 0;
        const by = Math.round(ip * base[1]) >> 0;
        const bz = Math.round(ip * base[2]) >> 0;

        result[0] = p * (bx + dx);
        result[1] = p * (by + dy);
        result[2] = p * (bz + dz);

        return result;
    }
}

function writeVarIntWithPrefix4 (code:number, x:number, stream:MuWriteStream) {
    const x0 = x & 7;
    const x1 = x >>> 3;
    const prefix = code | (x1 ? 16 : 0);
    stream.writeUint8((prefix << 3) | x0);
    if (x1) {
        stream.writeVarint(x1);
    }
}

function readShroeppelWithPrefix4 (prefix:number, stream:MuReadStream) {
    let x = prefix & 7;
    if (prefix & 128) {
        x += stream.readVarint() << 3;
    }
    return (SCHROEPPEL2 ^ x) - SCHROEPPEL2 >> 0;
}

export class MuQuantizedVec4 implements MuSchema<vec4> {
    public invPrecision = 1;
    public identity = vec4.create();
    public json:{
        type:'quantized-vec4';
        precision:number;
        identity:number[];
    };
    public muData:{
        type:'quantized-vec4';
        precision:number;
        identity:number[];
    } = {
        type: 'quantized-vec4',
        precision: 0,
        identity: [0, 0, 0, 0],
    };
    public readonly muType = 'quantized-vec4';

    constructor (
        public precision:number,
        identity?:vec4) {
        this.invPrecision = 1 / this.precision;
        if (identity) {
            this.identity[0] = this.precision * (Math.round(this.invPrecision * identity[0]) >> 0);
            this.identity[1] = this.precision * (Math.round(this.invPrecision * identity[1]) >> 0);
            this.identity[2] = this.precision * (Math.round(this.invPrecision * identity[2]) >> 0);
            this.identity[3] = this.precision * (Math.round(this.invPrecision * identity[3]) >> 0);
        }
        this.json = this.muData = {
            type: 'quantized-vec4',
            precision: this.precision,
            identity: [this.identity[0], this.identity[1], this.identity[2], this.identity[3]],
        };
    }

    public assign(x:vec4, y:vec4) {
        const ip = this.invPrecision;
        const p = this.precision;
        x[0] = (Math.round(ip * y[0]) >> 0) * p;
        x[1] = (Math.round(ip * y[1]) >> 0) * p;
        x[2] = (Math.round(ip * y[2]) >> 0) * p;
        x[3] = (Math.round(ip * y[3]) >> 0) * p;
        return x;
    }

    public clone (x:vec4) {
        const r = MuVec4.alloc();
        return this.assign(r, x);
    }

    public alloc () {
        return MuVec4.alloc();
    }

    public free (x:vec4) {
        return MuVec4.free(x);
    }

    public toJSON (x:vec4) {
        return [
            this.precision * (Math.round(this.invPrecision * x[0]) >> 0),
            this.precision * (Math.round(this.invPrecision * x[1]) >> 0),
            this.precision * (Math.round(this.invPrecision * x[2]) >> 0),
            this.precision * (Math.round(this.invPrecision * x[3]) >> 0),
        ];
    }

    public fromJSON (x:any) {
        if (Array.isArray(x) && x.length === 4 && typeof x[0] === 'number' && typeof x[1] === 'number' && typeof x[2] === 'number' && typeof x[3] === 'number') {
            return this.clone(<any>(x));
        }
        return MuVec4.clone(this.identity);
    }

    public equal (x:vec4, y:vec4) {
        const sf = this.invPrecision;
        return (
            (Math.round(sf * x[0]) >> 0) === (Math.round(sf * y[0]) >> 0) &&
            (Math.round(sf * x[1]) >> 0) === (Math.round(sf * y[1]) >> 0) &&
            (Math.round(sf * x[2]) >> 0) === (Math.round(sf * y[2]) >> 0) &&
            (Math.round(sf * x[3]) >> 0) === (Math.round(sf * y[3]) >> 0)
        );
    }

    public diff (base:vec4, target:vec4, stream:MuWriteStream) {
        const sf = this.invPrecision;
        const bx = Math.round(sf * base[0]) >> 0;
        const by = Math.round(sf * base[1]) >> 0;
        const bz = Math.round(sf * base[2]) >> 0;
        const bw = Math.round(sf * base[3]) >> 0;
        const tx = Math.round(sf * target[0]) >> 0;
        const ty = Math.round(sf * target[1]) >> 0;
        const tz = Math.round(sf * target[2]) >> 0;
        const tw = Math.round(sf * target[3]) >> 0;

        if (bx === tx && by === ty && bz === tz && bw === tw) {
            return false;
        }
        const dx = (SCHROEPPEL2 + (tx - bx) ^ SCHROEPPEL2) >>> 0;
        const dy = (SCHROEPPEL2 + (ty - by) ^ SCHROEPPEL2) >>> 0;
        const dz = (SCHROEPPEL2 + (tz - bz) ^ SCHROEPPEL2) >>> 0;
        const dw = (SCHROEPPEL2 + (tw - bw) ^ SCHROEPPEL2) >>> 0;

        const code =
            (dx ? 1 : 0) |
            (dy ? 2 : 0) |
            (dz ? 4 : 0) |
            (dw ? 8 : 0);

        stream.grow(21);
        if (dx) {
            writeVarIntWithPrefix4(code, dx, stream);
            dy && stream.writeVarint(dy);
            dz && stream.writeVarint(dz);
            dw && stream.writeVarint(dw);
        } else if (dy) {
            writeVarIntWithPrefix4(code, dy, stream);
            dz && stream.writeVarint(dz);
            dw && stream.writeVarint(dw);
        } else if (dz) {
            writeVarIntWithPrefix4(code, dz, stream);
            dw && stream.writeVarint(dw);
        } else {
            writeVarIntWithPrefix4(code, dw, stream);
        }

        return true;
    }

    public patch (base:vec4, stream:MuReadStream) {
        const prefix = stream.readUint8();

        let dx = 0;
        let dy = 0;
        let dz = 0;
        let dw = 0;
        if (prefix & 8) {
            dx = readShroeppelWithPrefix4(prefix, stream);
            (prefix & 16) && (dy = readShroeppel(stream));
            (prefix & 32) && (dz = readShroeppel(stream));
            (prefix & 64) && (dw = readShroeppel(stream));
        } else if (prefix & 16) {
            dy = readShroeppelWithPrefix4(prefix, stream);
            (prefix & 32) && (dz = readShroeppel(stream));
            (prefix & 64) && (dw = readShroeppel(stream));
        } else if (prefix & 32) {
            dz = readShroeppelWithPrefix4(prefix, stream);
            (prefix & 64) && (dw = readShroeppel(stream));
        } else {
            dw = readShroeppelWithPrefix4(prefix, stream);
        }

        const result = MuVec4.alloc();
        const ip = this.invPrecision;
        const p = this.precision;

        const bx = Math.round(ip * base[0]) >> 0;
        const by = Math.round(ip * base[1]) >> 0;
        const bz = Math.round(ip * base[2]) >> 0;
        const bw = Math.round(ip * base[3]) >> 0;

        result[0] = p * (bx + dx);
        result[1] = p * (by + dy);
        result[2] = p * (bz + dz);
        result[3] = p * (bw + dw);

        return result;
    }
}
