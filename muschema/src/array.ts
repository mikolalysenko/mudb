import { MuSchema } from './schema';
import { MuWriteStream, MuReadStream } from 'mustreams';

import {
    muType2ReadMethod,
    muType2WriteMethod,
} from './constants';

export type _MuArrayType<ValueSchema extends MuSchema<any>> = ValueSchema['identity'][];

export class MuArray<ValueSchema extends MuSchema<any>>
        implements MuSchema<_MuArrayType<ValueSchema>> {
    public readonly identity:_MuArrayType<ValueSchema> = [];
    public readonly muType = 'array';
    public readonly muData:ValueSchema;
    public readonly json:object;

    constructor(valueSchema:ValueSchema, id?:_MuArrayType<ValueSchema>) {
        this.identity = id || [];
        this.muData = valueSchema;
        this.json = {
            type: 'array',
            valueType: this.muData.json,
            identity: JSON.stringify(this.diff([], this.identity)),
        };
    }

    public alloc () : _MuArrayType<ValueSchema> { return []; }

    public free (x:_MuArrayType<ValueSchema>) : void {
        const valueSchema = this.muData;
        switch (valueSchema.muType) {
            case 'boolean':
            case 'float32':
            case 'float64':
            case 'int8':
            case 'int16':
            case 'int32':
            case 'string':
            case 'uint8':
            case 'uint16':
            case 'uint32':
                break;
            default:
                for (let i = 0; i < x.length; ++i) {
                    valueSchema.free(x[i]);
                }
        }
    }

    public clone (x:_MuArrayType<ValueSchema>) : _MuArrayType<ValueSchema> {
        const result = new Array(x.length);

        const schema = this.muData;
        switch (schema.muType) {
            case 'boolean':
            case 'float32':
            case 'float64':
            case 'int8':
            case 'int16':
            case 'int32':
            case 'string':
            case 'uint8':
            case 'uint16':
            case 'uint32':
                for (let i = 0; i < x.length; ++i) {
                    result[i] = x[i];
                }
                break;
            default:
                for (let i = 0; i < x.length; ++i) {
                    result[i] = schema.clone(x[i]);
                }
        }

        return result;
    }

    public diffBinary (base:_MuArrayType<ValueSchema>, target:_MuArrayType<ValueSchema>, ws:MuWriteStream) : boolean {
        const targetLength = target.length;
        const numTrackers = Math.ceil(targetLength / 8);
        ws.grow(8 + numTrackers + this.getByteLength(target));

        ws.writeUint32(targetLength);
        ws.writeUint32(numTrackers);

        let trackerOffset = ws.offset;
        ws.offset = trackerOffset + numTrackers;

        let numPatch = 0;
        let tracker = 0;

        const valueSchema = this.muData;
        const valueMuType = valueSchema.muType;
        for (let i = 0; i < targetLength; ++i) {
            if (valueSchema.diffBinary!(base[i], target[i], ws)) {
                tracker |= 1 << (i & 7);
                ++numPatch;
            }

            if ((i & 7) === 7) {
                ws.writeUint8At(trackerOffset, tracker);
                ++trackerOffset;
                tracker = 0;
            }
        }

        if (targetLength & 7) {
            ws.writeUint8At(trackerOffset, tracker);
        }

        return numPatch > 0 || (base.length !== targetLength);
    }

    public patchBinary (base:_MuArrayType<ValueSchema>, rs:MuReadStream) : _MuArrayType<ValueSchema> {
        const result = this.clone(base);

        const newLength = rs.readUint32();
        result.length = newLength;

        const numTrackers = rs.readUint32();
        const trackerOffset = rs.offset;
        rs.offset = trackerOffset + numTrackers;

        const valueSchema = this.muData;
        const valueMuType = valueSchema.muType;
        switch (valueMuType) {
            case 'float32':
            case 'float64':
            case 'int8':
            case 'int16':
            case 'int32':
            case 'string':
            case 'uint8':
            case 'uint16':
            case 'uint32':
                // TODO remove duplication
                const readMethod = muType2ReadMethod[valueMuType];
                for (let i = 0; i < numTrackers; ++i) {
                    const start = i * 8;
                    const tracker = rs.readUint8At(trackerOffset + i);

                    for (let j = 0; j < 8; ++j) {
                        if ((1 << j) & tracker) {
                            result[start + j] = rs[readMethod]();
                        }
                    }
                }
                break;

            default:
                for (let i = 0; i < numTrackers; ++i) {
                    const start = i * 8;
                    const tracker = rs.readUint8At(trackerOffset + i);

                    for (let j = 0; j < 8; ++j) {
                        if ((1 << j) & tracker) {
                            const index = start + j;
                            result[index] = valueSchema.patchBinary!(base[index], rs);
                        }
                    }
                }
        }

        return result;
    }

    public getByteLength (x:_MuArrayType<ValueSchema>) : number {
        const valueSchema = this.muData;
        const length = x.length;
        switch (valueSchema.muType) {
            case 'boolean':
            case 'int8':
            case 'uint8':
                return length;
            case 'int16':
            case 'uint16':
                return length * 2;
            case 'float32':
            case 'int32':
            case 'uint32':
                return length * 4;
            case 'float64':
                return length * 8;
            default:
                let result = 0;
                for (let i = 0; i < length; ++i) {
                    result += valueSchema.getByteLength!(x[i]);
                }
                return result;
        }
    }

    public diff(base:_MuArrayType<ValueSchema>, target:_MuArrayType<ValueSchema>) {
        const schema = this.muData;
        const result = new Array(target.length);
        let changed = base.length !== target.length;
        for (let i = 0; i < target.length; ++i) {
            if (i < base.length) {
                const p = schema.diff(base[i], target[i])
                if (typeof p !== undefined) {
                    changed = true;
                }
                result[i] = p;
            } else {
                result[i] = schema.diff(schema.identity, target[i]);
            }
        }
        if (changed) {
            return result;
        }
        return;
     }

    public patch(base:_MuArrayType<ValueSchema>, patch:any[]|undefined) {
        if (!patch) {
            return this.clone(base);
        }
        const result:_MuArrayType<ValueSchema> = new Array(patch.length);
        const schema = this.muData;
        for (let i = 0; i < patch.length; ++i) {
            const x = patch[i];
            if (x === undefined || x === null) {
                if (i < base.length) {
                    result[i] = schema.clone(base[i]);
                } else {
                    result[i] = schema.clone(schema.identity);
                }
            } else {
                if (i < base.length) {
                    result[i] = schema.patch(base[i], x);
                } else {
                    result[i] = schema.patch(schema.identity, x);
                }
            }
        }
        return result;
     }
}
