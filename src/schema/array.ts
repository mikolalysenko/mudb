import { MuWriteStream, MuReadStream } from '../stream';

import { MuSchema } from './schema';
import { isMuPrimitiveType } from './type';

export class MuArray<ValueSchema extends MuSchema<any>>
        implements MuSchema<ValueSchema['identity'][]> {
    public readonly muType = 'array';

    public readonly identity:ValueSchema['identity'][];
    public readonly muData:ValueSchema;
    public readonly json:object;
    public readonly capacity:number;

    public pool:ValueSchema['identity'][][] = [];

    constructor (
        valueSchema:ValueSchema,
        capacity:number,
        identity?:ValueSchema['identity'][],
    ) {
        this.muData = valueSchema;
        this.capacity = capacity;
        this.identity = identity || [];
        this.json = {
            type: 'array',
            valueType: this.muData.json,
            identity: JSON.stringify(this.identity),
        };
    }

    public alloc () : ValueSchema['identity'][] {
        return this.pool.pop() || [];
    }

    public free (arr:ValueSchema['identity'][]) : void {
        const valueSchema = this.muData;
        for (let i = 0; i < arr.length; ++i) {
            valueSchema.free(arr[i]);
        }
        arr.length = 0;
        this.pool.push(arr);
    }

    public equal (a:ValueSchema['identity'][], b:ValueSchema['identity'][]) {
        if (!Array.isArray(a) || !Array.isArray(b)) {
            return false;
        }
        if (a.length !== b.length) {
            return false;
        }

        const valueSchema = this.muData;
        for (let i = a.length - 1; i >= 0 ; --i) {
            if (!valueSchema.equal(a[i], b[i])) {
                return false;
            }
        }
        return true;
    }

    public clone (arr:ValueSchema['identity'][]) : ValueSchema['identity'][] {
        const copy = this.alloc();
        copy.length = arr.length;

        const valueSchema = this.muData;
        for (let i = 0; i < arr.length; ++i) {
            copy[i] = valueSchema.clone(arr[i]);
        }
        return copy;
    }

    public assign (dst:ValueSchema['identity'][], src:ValueSchema['identity'][]) {
        if (dst === src) {
            return;
        }

        const dLeng = dst.length;
        const sLeng = src.length;
        const valueSchema = this.muData;

        // pool extra elements in dst
        for (let i = sLeng; i < dLeng; ++i) {
            valueSchema.free(dst[i]);
        }

        dst.length = sLeng;

        if (isMuPrimitiveType(valueSchema.muType)) {
            for (let i = 0; i < sLeng; ++i) {
                dst[i] = src[i];
            }
            return;
        }

        // done if src has less or same number of elements
        for (let i = 0; i < Math.min(dLeng, sLeng); ++i) {
            valueSchema.assign(dst[i], src[i]);
        }
        // only if src has more elements
        for (let i = dLeng; i < sLeng; ++i) {
            dst[i] = valueSchema.clone(src[i]);
        }
    }

    public diff (
        base:ValueSchema['identity'][],
        target:ValueSchema['identity'][],
        out:MuWriteStream,
    ) : boolean {
        const tLength = target.length;
        if (tLength > this.capacity) {
            throw new RangeError(`target length ${tLength} exceeds capacity ${this.capacity}`);
        }

        const numTrackers = Math.ceil(tLength / 8);
        out.grow(4 + numTrackers);

        const head = out.offset;
        out.writeUint32(tLength);
        let trackerOffset = out.offset;
        out.offset += numTrackers;

        let tracker = 0;
        let numPatches = 0;

        const bLength = base.length;
        const schema = this.muData;
        for (let i = 0; i < Math.min(bLength, tLength); ++i) {
            if (schema.diff(base[i], target[i], out)) {
                tracker |= 1 << (i & 7);
                ++numPatches;
            }
            if ((i & 7) === 7) {
                out.writeUint8At(trackerOffset++, tracker);
                tracker = 0;
            }
        }
        for (let i = bLength; i < tLength; ++i) {
            if (schema.diff(schema.identity, target[i], out)) {
                tracker |= 1 << (i & 7);
                ++numPatches;
            }
            if ((i & 7) === 7) {
                out.writeUint8At(trackerOffset++, tracker);
                tracker = 0;
            }
        }
        if (tLength & 7) {
            out.writeUint8At(trackerOffset, tracker);
        }

        if (numPatches > 0 || bLength !== tLength) {
            return true;
        }
        out.offset = head;
        return false;
    }

    public patch (
        base:ValueSchema['identity'][],
        inp:MuReadStream,
    ) : ValueSchema['identity'][] {
        const tLength = inp.readUint32();
        if (tLength > this.capacity) {
            throw new RangeError(`target length ${tLength} exceeds capacity ${this.capacity}`);
        }

        const numTrackers = Math.ceil(tLength / 8);
        let trackerOffset = inp.offset;
        inp.offset += numTrackers;

        const result = this.clone(base);
        result.length = tLength;

        const bLength = base.length;
        const schema = this.muData;
        let tracker = 0;
        for (let i = 0; i < Math.min(bLength, tLength); ++i) {
            const mod8 = i & 7;
            if (!mod8) {
                tracker = inp.readUint8At(trackerOffset++);
            }
            if ((1 << mod8) & tracker) {
                result[i] = schema.patch(base[i], inp);
            }
        }
        for (let i = bLength; i < tLength; ++i) {
            const mod8 = i & 7;
            if (!mod8) {
                tracker = inp.readUint8At(trackerOffset++);
            }
            if ((1 << mod8) & tracker) {
                result[i] = schema.patch(schema.identity, inp);
            } else {
                result[i] = schema.clone(schema.identity);
            }
        }

        return result;
    }

    public toJSON (arr:ValueSchema['identity'][]) : any[] {
        const valueSchema = this.muData;
        return arr.map((v) => valueSchema.toJSON(v));
    }

    public fromJSON (json:any[]) : ValueSchema['identity'][] {
        const arr = this.alloc();
        arr.length = json.length;

        const valueSchema = this.muData;
        for (let i = 0; i < json.length; ++i) {
            arr[i] = valueSchema.fromJSON(json[i]);
        }
        return arr;
    }
}
