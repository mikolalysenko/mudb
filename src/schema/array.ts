import { MuWriteStream, MuReadStream } from '../stream';
import { MuSchema } from './schema';
import { isMuPrimitiveType } from './is-primitive';

function assignPrimitive<T> (dst:T[], src:T[]) : T[] {
    const N = src.length;
    const M = dst.length;
    const L = Math.min(M, N);
    for (let i = 0; i < L; ++i) {
        dst[i] = src[i];
    }
    for (let i = M; i < N; ++i) {
        dst.push(src[i]);
    }
    dst.length = N;
    return dst;
}

function clonePrimitive<T> (src:T[]) : T[] {
    return src.slice();
}

function equalPrimitive<T> (a:T[], b:T[]) : boolean {
    const N = a.length;
    const M = b.length;
    if (N !== M) {
        return false;
    }
    for (let i = 0; i < N; ++i) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
}

function toJSONPrimitive<T> (a:T[]) : T[] {
    return a.slice();
}

function assignGeneric<T> (schema:MuSchema<T>) {
    return (dst:T[], src:T[]) => {
        const N = src.length;
        const M = dst.length;
        const L = Math.min(M, N);
        for (let i = 0; i < L; ++i) {
            dst[i] = schema.assign(dst[i], src[i]);
        }
        for (let i = M; i < N; ++i) {
            dst.push(schema.clone(src[i]));
        }
        for (let i = N; i < M; ++i) {
            schema.free(dst[i]);
        }
        dst.length = N;
        return dst;
    };
}

function cloneGeneric<T> (schema:MuSchema<T>) {
    return (src:T[]) => {
        const result = src.slice();
        for (let i = 0; i < result.length; ++i) {
            result[i] = schema.clone(result[i]);
        }
        return result;
    };
}

function freeGeneric<T> (schema:MuSchema<T>) {
    return (src:T[]) => {
        for (let i = 0; i < src.length; ++i) {
            schema.free(src[i]);
        }
        src.length = 0;
    };
}

function equalGeneric<T> (schema:MuSchema<T>) {
    return (a:T[], b:T[]) => {
        const N = a.length;
        const M = b.length;
        if (N !== M) {
            return false;
        }
        for (let i = 0; i < N; ++i) {
            if (!schema.equal(a[i], b[i])) {
                return false;
            }
        }
        return true;
    };
}

function toJSONGeneric<T> (schema:MuSchema<T>) {
    return (arr:T[]) : any[] => {
        const result = new Array(arr.length);
        for (let i = 0; i < arr.length; ++i) {
            result[i] = schema.toJSON(arr[i]);
        }
        return result;
    };
}

export class MuArray<ValueSchema extends MuSchema<any>>
        implements MuSchema<ValueSchema['identity'][]> {
    public readonly muType = 'array';
    public readonly identity:ValueSchema['identity'][];
    public readonly muData:ValueSchema;
    public readonly json:object;
    public readonly capacity:number;

    public assign:(dst:ValueSchema['identity'][], src:ValueSchema['identity'][]) => ValueSchema['identity'][];
    public free:(x:ValueSchema['identity'][]) => void;
    public clone:(src:ValueSchema['identity'][]) => ValueSchema['identity'][];
    public equal:(a:ValueSchema['identity'][], b:ValueSchema['identity'][]) => boolean;
    public toJSON:(src:ValueSchema['identity'][]) => any;

    constructor (
        schema:ValueSchema,
        capacity:number,
        identity?:ValueSchema['identity'][],
    ) {
        this.muData = schema;
        this.capacity = capacity;
        if (identity) {
            const copy = this.identity = identity.slice();
            for (let i = 0; i < copy.length; ++i) {
                copy[i] = schema.clone(copy[i]);
            }
        } else {
            this.identity = [];
        }
        this.json = {
            type: 'array',
            valueType: schema.json,
            identity: JSON.stringify(this.identity),
        };
        if (isMuPrimitiveType(schema.muType)) {
            this.assign = assignPrimitive;
            this.clone = clonePrimitive;
            this.free = (x) => x.length = 0;
            this.equal = equalPrimitive;
            this.toJSON = toJSONPrimitive;
        } else {
            this.assign = assignGeneric(schema);
            this.clone = cloneGeneric(schema);
            this.free = freeGeneric(schema);
            this.equal = equalGeneric(schema);
            this.toJSON = toJSONGeneric(schema);
        }
    }

    public alloc () : ValueSchema['identity'][] {
        return [];
    }

    public diff (
        base:ValueSchema['identity'][],
        target:ValueSchema['identity'][],
        out:MuWriteStream,
    ) : boolean {
        const tLeng = target.length;
        const numTrackers = Math.ceil(tLeng / 8);
        out.grow(4 + numTrackers);

        const head = out.offset;
        out.writeVarint(tLeng);
        let trackerOffset = out.offset;
        out.offset += numTrackers;

        let tracker = 0;
        let numPatches = 0;

        const bLeng = base.length;
        const schema = this.muData;
        for (let i = 0; i < Math.min(bLeng, tLeng); ++i) {
            if (schema.diff(base[i], target[i], out)) {
                tracker |= 1 << (i & 7);
                ++numPatches;
            }
            if ((i & 7) === 7) {
                out.writeUint8At(trackerOffset++, tracker);
                tracker = 0;
            }
        }
        for (let i = bLeng; i < tLeng; ++i) {
            if (schema.diff(schema.identity, target[i], out)) {
                tracker |= 1 << (i & 7);
                ++numPatches;
            }
            if ((i & 7) === 7) {
                out.writeUint8At(trackerOffset++, tracker);
                tracker = 0;
            }
        }
        if (tLeng & 7) {
            out.writeUint8At(trackerOffset, tracker);
        }

        if (numPatches > 0 || bLeng !== tLeng) {
            return true;
        }
        out.offset = head;
        return false;
    }

    public patch (
        base:ValueSchema['identity'][],
        inp:MuReadStream,
    ) : ValueSchema['identity'][] {
        const tLeng = inp.readVarint();
        if (tLeng > this.capacity) {
            throw new RangeError(`target length ${tLeng} exceeds capacity ${this.capacity}`);
        }

        const bLeng = base.length;
        const L = Math.min(bLeng, tLeng);

        const numTrackers = Math.ceil(tLeng / 8);
        let trackerOffset = inp.offset;
        inp.offset += numTrackers;

        const result = base.slice();
        const schema = this.muData;
        result.length = L;
        let tracker = 0;
        for (let i = 0; i < L; ++i) {
            const mod8 = i & 7;
            if (!mod8) {
                tracker = inp.readUint8At(trackerOffset++);
            }
            if ((1 << mod8) & tracker) {
                result[i] = schema.patch(base[i], inp);
            } else {
                result[i] = schema.clone(base[i]);
            }
        }
        for (let i = bLeng; i < tLeng; ++i) {
            const mod8 = i & 7;
            if (!mod8) {
                tracker = inp.readUint8At(trackerOffset++);
            }
            if ((1 << mod8) & tracker) {
                result.push(schema.patch(schema.identity, inp));
            } else {
                result.push(schema.clone(schema.identity));
            }
        }

        return result;
    }

    public fromJSON (x:any[]) : ValueSchema['identity'][] {
        if (Array.isArray(x)) {
            const arr = new Array(x.length);
            const schema = this.muData;
            for (let i = 0; i < x.length; ++i) {
                arr[i] = schema.fromJSON(x[i]);
            }
            return arr;
        }
        return this.clone(this.identity);
    }
}
