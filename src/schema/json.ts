import { MuWriteStream, MuReadStream } from '../stream';
import { MuSchema } from './schema';

function equal (a, b) : boolean {
    if (a === b) {
        return true;
    }

    if (a && b && typeof a === 'object' && typeof b === 'object') {
        const aIsArr = Array.isArray(a);
        const bIsArr = Array.isArray(b);
        if (aIsArr !== bIsArr) { return false; }
        if (aIsArr) {
            const leng = a.length;
            if (leng !== b.length) {
                return false;
            }
            for (let i = leng - 1; i >= 0; --i) {
                if (!equal(a[i], b[i])) {
                    return false;
                }
            }
            return true;
        }

        const keys = Object.keys(a);
        if (keys.length !== Object.keys(b).length) {
            return false;
        }
        for (let i = 0; i < keys.length; ++i) {
            const key = keys[i];
            if (!b.hasOwnProperty(key) || !equal(a[key], b[key])) {
                return false;
            }
        }
        return true;
    }

    return a !== a && b !== b;
}

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

export const deepEqual = equal;
export const deepClone = clone;

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

    public equal (a:object, b:object) : boolean {
        return deepEqual(a, b);
    }

    public clone (obj:object) : object {
        return deepClone(obj);
    }

    public assign (dst:object, src:object) : object {
        if (Array.isArray(dst) && Array.isArray(src)) {
            dst.length = src.length;
            for (let i = 0; i < dst.length; ++i) {
                dst[i] = deepClone(src[i]);
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
            dst[key] = deepClone(src[key]);
        }
        return dst;
    }

    public diff (base:object, target:object, out:MuWriteStream) : boolean {
        const str = JSON.stringify(target);
        out.writeString(str);
        return true;
    }

    public patch (base:object, inp:MuReadStream) : object {
        return JSON.parse(inp.readString());
    }

    public toJSON (obj:object) : object { return obj; }

    public fromJSON (x:object) : object {
        if (typeof x === 'object' && x) {
            return x;
        }
        return this.clone(this.identity);
    }
}
