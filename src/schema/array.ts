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
        schema:ValueSchema,
        capacity:number,
        identity?:ValueSchema['identity'][],
    ) {
        this.muData = schema;
        this.capacity = capacity;
        this.identity = identity || [];
        this.json = {
            type: 'array',
            valueType: schema.json,
            identity: JSON.stringify(this.identity),
        };
    }

    public alloc () : ValueSchema['identity'][] {
        return this.pool.pop() || [];
    }

    public free (arr:ValueSchema['identity'][]) : void {
        const schema = this.muData;
        for (let i = 0; i < arr.length; ++i) {
            schema.free(arr[i]);
        }
        arr.length = 0;
        this.pool.push(arr);
    }

    public equal (
        a:ValueSchema['identity'][],
        b:ValueSchema['identity'][],
    ) : boolean {
        if (a.length !== b.length) {
            return false;
        }

        const schema = this.muData;
        for (let i = a.length - 1; i >= 0 ; --i) {
            if (!schema.equal(a[i], b[i])) {
                return false;
            }
        }
        return true;
    }

    public clone (arr:ValueSchema['identity'][]) : ValueSchema['identity'][] {
        const copy = this.alloc();
        copy.length = arr.length;

        const schema = this.muData;
        for (let i = 0; i < arr.length; ++i) {
            copy[i] = schema.clone(arr[i]);
        }
        return copy;
    }

    public assign (
        dst:ValueSchema['identity'][],
        src:ValueSchema['identity'][],
    ) : ValueSchema['identity'][] {
        const dLeng = dst.length;
        const sLeng = src.length;
        const schema = this.muData;
        for (let i = sLeng; i < dLeng; ++i) {
            schema.free(dst[i]);
        }

        dst.length = sLeng;
        if (isMuPrimitiveType(schema.muType)) {
            for (let i = 0; i < sLeng; ++i) {
                dst[i] = src[i];
            }
            return dst;
        }

        for (let i = 0; i < Math.min(dLeng, sLeng); ++i) {
            schema.assign(dst[i], src[i]);
        }
        for (let i = dLeng; i < sLeng; ++i) {
            dst[i] = schema.clone(src[i]);
        }
        return dst;
    }

    public diff (
        base:ValueSchema['identity'][],
        target:ValueSchema['identity'][],
        out:MuWriteStream,
    ) : boolean {
        const tLeng = target.length;
        if (tLeng > this.capacity) {
            throw new RangeError(`target length ${tLeng} exceeds capacity ${this.capacity}`);
        }

        const numTrackers = Math.ceil(tLeng / 8);
        out.grow(4 + numTrackers);

        const head = out.offset;
        out.writeUint32(tLeng);
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
        const tLeng = inp.readUint32();
        if (tLeng > this.capacity) {
            throw new RangeError(`target length ${tLeng} exceeds capacity ${this.capacity}`);
        }

        const numTrackers = Math.ceil(tLeng / 8);
        let trackerOffset = inp.offset;
        inp.offset += numTrackers;

        const result = this.clone(base);
        result.length = tLeng;

        const bLeng = base.length;
        const schema = this.muData;
        let tracker = 0;
        for (let i = 0; i < Math.min(bLeng, tLeng); ++i) {
            const mod8 = i & 7;
            if (!mod8) {
                tracker = inp.readUint8At(trackerOffset++);
            }
            if ((1 << mod8) & tracker) {
                result[i] = schema.patch(base[i], inp);
            }
        }
        for (let i = bLeng; i < tLeng; ++i) {
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
        const schema = this.muData;
        return arr.map((v) => schema.toJSON(v));
    }

    public fromJSON (json:any[]) : ValueSchema['identity'][] {
        const arr = this.alloc();
        arr.length = json.length;

        const schema = this.muData;
        for (let i = 0; i < json.length; ++i) {
            arr[i] = schema.fromJSON(json[i]);
        }
        return arr;
    }
}
