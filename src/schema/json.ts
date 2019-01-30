import { MuWriteStream, MuReadStream } from '../stream';
import { MuSchema } from './schema';

function clone (x) {
    if (typeof x !== 'object' || x === null) {
        return x;
    }

    const copy = Array.isArray(x) ? [] : {};
    if (Array.isArray(copy)) {
        copy.length = x.length;
        for (let i = 0; i < x.length; ++i) {
            copy[i] = clone(x[i]);
        }
    } else {
        const keys = Object.keys(x);
        for (let i = 0; i < keys.length; ++i) {
            const key = keys[i];
            copy[key] = clone(x[key]);
        }
    }
    return copy;
}

export class MuJSON implements MuSchema<object> {
    public readonly muType = 'json';
    public readonly identity:object;
    public readonly json:object;

    constructor (identity?:object) {
        this.identity = identity && clone(identity);
        this.identity = this.identity || {};
        this.json = {
            type: 'json',
            identity: this.identity,
        };
    }

    public alloc () : object { return {}; }
    public free () : void { }

    // TODO: make result deterministic
    public equal (a:object, b:object) : boolean {
        return JSON.stringify(a) === JSON.stringify(b);
    }

    public clone (json:object) : object {
        return clone(json);
    }

    public assign (dst:object, src:object) : object {
        if (Array.isArray(dst) && Array.isArray(src)) {
            dst.length = src.length;
            for (let i = 0; i < dst.length; ++i) {
                dst[i] = clone(src[i]);
            }
            return dst;
        }

        const dKeys = Object.keys(dst);
        for (let i = 0; i < dKeys.length; ++i) {
            const key = dKeys[i];
            if (!(key in src)) {
                delete dst[key];
            }
        }
        const sKeys = Object.keys(src);
        for (let i = 0; i < sKeys.length; ++i) {
            const key = sKeys[i];
            dst[key] = clone(src[key]);
        }
        return dst;
    }

    public diff (base:object, target:object, out:MuWriteStream) : boolean {
        const ts = JSON.stringify(target);
        out.grow(4 + 4 * ts.length);
        out.writeString(ts);
        return true;
    }

    public patch (base:object, inp:MuReadStream) : object {
        return JSON.parse(inp.readString());
    }

    public toJSON (obj:object) : object { return obj; }
    public fromJSON (json:object) : object { return json; }
}
