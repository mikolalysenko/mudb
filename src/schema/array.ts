import { MuWriteStream, MuReadStream } from '../stream';

import { MuSchema } from './schema';
import { isMuPrimitive } from './util';

export type _MuArrayType<ValueSchema extends MuSchema<any>> = ValueSchema['identity'][];

export class MuArray<ValueSchema extends MuSchema<any>>
        implements MuSchema<_MuArrayType<ValueSchema>> {
    public readonly identity:_MuArrayType<ValueSchema> = [];
    public readonly muType = 'array';
    public readonly muData:ValueSchema;
    public readonly json:object;

    public pool:ValueSchema['identity'][][] = [];

    constructor(valueSchema:ValueSchema, id?:_MuArrayType<ValueSchema>) {
        this.identity = id || [];
        this.muData = valueSchema;
        this.json = {
            type: 'array',
            valueType: this.muData.json,
            identity: JSON.stringify(this.identity),
        };
    }

    public alloc () : _MuArrayType<ValueSchema> {
        return this.pool.pop() || [];
    }

    public free (arr:_MuArrayType<ValueSchema>) : void {
        const valueSchema = this.muData;
        for (let i = 0; i < arr.length; ++i) {
            valueSchema.free(arr[i]);
        }
        arr.length = 0;
        this.pool.push(arr);
    }

    public equal (x:_MuArrayType<ValueSchema>, y:_MuArrayType<ValueSchema>) {
        if (!Array.isArray(x) || !Array.isArray(y)) {
            return false;
        }
        if (x.length !== y.length) {
            return false;
        }
        for (let i = x.length - 1; i >= 0 ; --i) {
            if (!this.muData.equal(x[i], y[i])) {
                return false;
            }
        }

        return true;
    }

    public clone (arr:_MuArrayType<ValueSchema>) : _MuArrayType<ValueSchema> {
        const result = this.alloc();
        result.length = arr.length;

        const valueSchema = this.muData;
        for (let i = 0; i < arr.length; ++i) {
            result[i] = valueSchema.clone(arr[i]);
        }

        return result;
    }

    public copy (source:_MuArrayType<ValueSchema>, target:_MuArrayType<ValueSchema>) {
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
        base:_MuArrayType<ValueSchema>,
        target:_MuArrayType<ValueSchema>,
        stream:MuWriteStream,
    ) : boolean {
        const prefixOffset = stream.offset;
        const targetLength = target.length;

        const numTrackers = Math.ceil(targetLength / 8);
        stream.grow(4 + numTrackers);

        stream.writeUint32(targetLength);

        let trackerOffset = stream.offset;
        stream.offset = trackerOffset + numTrackers;

        let tracker = 0;
        let numPatch = 0;

        const baseLength = base.length;
        const valueSchema = this.muData;
        for (let i = 0; i < Math.min(baseLength, targetLength); ++i) {
            if (valueSchema.diff(base[i], target[i], stream)) {
                tracker |= 1 << (i & 7);
                ++numPatch;
            }

            if ((i & 7) === 7) {
                stream.writeUint8At(trackerOffset++, tracker);
                tracker = 0;
            }
        }

        for (let i = baseLength; i < targetLength; ++i) {
            if (valueSchema.diff(valueSchema.identity, target[i], stream)) {
                tracker |= 1 << (i & 7);
                ++numPatch;
            }

            if ((i & 7) === 7) {
                stream.writeUint8At(trackerOffset++, tracker);
                tracker = 0;
            }
        }

        if (targetLength & 7) {
            stream.writeUint8At(trackerOffset, tracker);
        }

        if (numPatch > 0 || baseLength !== targetLength) {
            return true;
        }
        stream.offset = prefixOffset;
        return false;
    }

    public patch (
        base:_MuArrayType<ValueSchema>,
        stream:MuReadStream,
    ) : _MuArrayType<ValueSchema> {
        const result = this.clone(base);

        const targetLength = stream.readUint32();
        result.length = targetLength;

        let trackerOffset = stream.offset;
        const numTrackers = Math.ceil(targetLength / 8);
        stream.offset = trackerOffset + numTrackers;

        let tracker = 0;

        const baseLength = base.length;
        const valueSchema = this.muData;
        for (let i = 0; i < Math.min(baseLength, targetLength); ++i) {
            const mod8 = i & 7;

            if (!mod8) {
                tracker = stream.readUint8At(trackerOffset++);
            }

            if ((1 << mod8) & tracker) {
                result[i] = valueSchema.patch(base[i], stream);
            }
        }

        for (let i = baseLength; i < targetLength; ++i) {
            const mod8 = i & 7;

            if (!mod8) {
                tracker = stream.readUint8At(trackerOffset++);
            }

            if ((1 << mod8) & tracker) {
                result[i] = valueSchema.patch(valueSchema.identity, stream);
            } else {
                result[i] = valueSchema.clone(valueSchema.identity);
            }
        }

        return result;
    }
}
