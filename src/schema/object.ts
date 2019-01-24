import { MuWriteStream, MuReadStream } from '../stream';
import { MuSchema } from './schema';

function isPlainObject (x) : boolean {
    if (typeof x !== 'object' || x === null) {
        return false;
    }

    let proto = x;
    while (Object.getPrototypeOf(proto) !== null) {
        proto = Object.getPrototypeOf(proto);
    }
    return Object.getPrototypeOf(x) === proto;
}

export class MuObject implements MuSchema<object> {
    public readonly muType = 'object';
    public readonly identity:object;
    public readonly json:object;

    constructor (identity?:object) {
        this.identity = identity && JSON.parse(JSON.stringify(identity));
        this.identity = this.identity || {};
        this.json = {
            type: 'object',
            identity: this.identity,
        };
    }

    public alloc () : object { return {}; }
    public free () : void { }

    // TODO: make result deterministic
    public equal (a:object, b:object) : boolean {
        return JSON.stringify(a) === JSON.stringify(b);
    }

    public clone (obj:object) : object {
        return JSON.parse(JSON.stringify(obj));
    }

    public assign (dst:object, src:object) : object {
        if (isPlainObject(dst) && Array.isArray(src) ||
            Array.isArray(dst) && isPlainObject(src)) {
            throw new TypeError('type of dst is different from src');
        }

        if (Array.isArray(dst) && Array.isArray(src)) {
            dst.length = src.length;
            for (let i = 0; i < dst.length; ++i) {
                dst[i] = JSON.parse(JSON.stringify(src[i]));
            }
            return dst;
        }

        const dKeys = Object.keys(dst);
        for (let i = 0; i < dKeys.length; ++i) {
            const k = dKeys[i];
            if (!(k in src)) {
                delete dst[k];
            }
        }
        const sKeys = Object.keys(src);
        for (let i = 0; i < sKeys.length; ++i) {
            const k = sKeys[i];
            dst[k] = JSON.parse(JSON.stringify(src[k]));
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
