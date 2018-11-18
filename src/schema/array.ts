import { MuWriteStream, MuReadStream } from '../stream';

import { MuSchema } from './schema';
import { isMuPrimitive } from './util/type';

export class MuArray<ValueSchema extends MuSchema<any>>
        implements MuSchema<ValueSchema['identity'][]> {
    public readonly identity:ValueSchema['identity'][] = [];
    public readonly muType = 'array';
    public readonly muData:ValueSchema;
    public readonly json:object;

    public pool:ValueSchema['identity'][][] = [];

    constructor(valueSchema:ValueSchema, identity?:ValueSchema['identity'][]) {
        this.identity = identity || [];
        this.muData = valueSchema;
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
        for (let i = a.length - 1; i >= 0 ; --i) {
            if (!this.muData.equal(a[i], b[i])) {
                return false;
            }
        }

        return true;
    }

    public clone (arr:ValueSchema['identity'][]) : ValueSchema['identity'][] {
        const result = this.alloc();
        result.length = arr.length;

        const valueSchema = this.muData;
        for (let i = 0; i < arr.length; ++i) {
            result[i] = valueSchema.clone(arr[i]);
        }

        return result;
    }

    public copy (source:ValueSchema['identity'][], target:ValueSchema['identity'][]) {
        if (source === target) {
            return;
        }

        const sourceLength = source.length;
        const targetLength = target.length;

        for (let i = sourceLength; i < targetLength; ++i) {
            this.muData.free(target[i]);
        }
        target.length = sourceLength;

        if (isMuPrimitive(this.muData.muType)) {
            for (let i = 0; i < sourceLength; ++i) {
                target[i] = source[i];
            }
            return;
        }

        for (let i = targetLength; i < target.length; ++i) {
            target[i] = this.muData.clone(source[i]);
        }
        for (let i = 0; i < Math.min(sourceLength, targetLength); ++i) {
            this.muData.copy(source[i], target[i]);
        }
    }

    public diff (
        base:ValueSchema['identity'][],
        target:ValueSchema['identity'][],
        out:MuWriteStream,
    ) : boolean {
        const prefixOffset = out.offset;
        const targetLength = target.length;

        const numTrackers = Math.ceil(targetLength / 8);
        out.grow(4 + numTrackers);

        out.writeUint32(targetLength);

        let trackerOffset = out.offset;
        out.offset = trackerOffset + numTrackers;

        let tracker = 0;
        let numPatch = 0;

        const baseLength = base.length;
        const valueSchema = this.muData;
        for (let i = 0; i < Math.min(baseLength, targetLength); ++i) {
            if (valueSchema.diff(base[i], target[i], out)) {
                tracker |= 1 << (i & 7);
                ++numPatch;
            }

            if ((i & 7) === 7) {
                out.writeUint8At(trackerOffset++, tracker);
                tracker = 0;
            }
        }

        for (let i = baseLength; i < targetLength; ++i) {
            if (valueSchema.diff(valueSchema.identity, target[i], out)) {
                tracker |= 1 << (i & 7);
                ++numPatch;
            }

            if ((i & 7) === 7) {
                out.writeUint8At(trackerOffset++, tracker);
                tracker = 0;
            }
        }

        if (targetLength & 7) {
            out.writeUint8At(trackerOffset, tracker);
        }

        if (numPatch > 0 || baseLength !== targetLength) {
            return true;
        }
        out.offset = prefixOffset;
        return false;
    }

    public patch (
        base:ValueSchema['identity'][],
        inp:MuReadStream,
    ) : ValueSchema['identity'][] {
        const result = this.clone(base);

        const targetLength = inp.readUint32();
        result.length = targetLength;

        let trackerOffset = inp.offset;
        const numTrackers = Math.ceil(targetLength / 8);
        inp.offset = trackerOffset + numTrackers;

        let tracker = 0;

        const baseLength = base.length;
        const valueSchema = this.muData;
        for (let i = 0; i < Math.min(baseLength, targetLength); ++i) {
            const mod8 = i & 7;

            if (!mod8) {
                tracker = inp.readUint8At(trackerOffset++);
            }

            if ((1 << mod8) & tracker) {
                result[i] = valueSchema.patch(base[i], inp);
            }
        }

        for (let i = baseLength; i < targetLength; ++i) {
            const mod8 = i & 7;

            if (!mod8) {
                tracker = inp.readUint8At(trackerOffset++);
            }

            if ((1 << mod8) & tracker) {
                result[i] = valueSchema.patch(valueSchema.identity, inp);
            } else {
                result[i] = valueSchema.clone(valueSchema.identity);
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
