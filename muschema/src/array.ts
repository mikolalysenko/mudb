import { MuSchema } from './schema';
import { MuWriteStream, MuReadStream } from 'mustreams';

import {
    muType2ReadMethod,
    muType2WriteMethod,
} from './constants';

export type _MuArrayType<ValueSchema extends MuSchema<any>> = ValueSchema['identity'][];

export class MuArray<ValueSchema extends MuSchema<any>>
        implements MuSchema<_MuArrayType<ValueSchema>> {
    private _pool:_MuArrayType<ValueSchema>[] = [];

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

    public alloc () : _MuArrayType<ValueSchema> {
        return this._pool.pop() || this.identity.slice();
    }

    public free (x:_MuArrayType<ValueSchema>) : void {
        this._pool.push(x);

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
        const result = this._pool.pop() || new Array(x.length);

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

    public diffBinary (base:_MuArrayType<ValueSchema>, target:_MuArrayType<ValueSchema>, ws:MuWriteStream) {
        const targetLength = target.length;
        const lengthDiff = base.length - target.length;
        const numDelete = lengthDiff > 0 ? lengthDiff : 0;
        ws.writeUint32(numDelete);

        const trackerBytes = Math.ceil(targetLength / 8);
        ws.writeUint32(trackerBytes);

        let trackerOffset = ws.offset;
        ws.offset = trackerOffset + trackerBytes;

        let numPatch = 0;
        let tracker = 0;

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
                // TODO do code generation instead
                const writeMethod = muType2WriteMethod[valueMuType];
                for (let i = 0; i < targetLength; ++i) {
                    if (target[i] !== base[i]) {
                        ws[writeMethod](target[i]);
                        ++numPatch;
                        tracker |= 1 << (i & 7);
                    }

                    if ((i & 7) === 7) {
                        ws.writeUint8At(trackerOffset, i);
                        ++trackerOffset;
                        tracker = 0;
                    }
                }
                break;
            default:
                for (let i = 0; i < targetLength; ++i) {
                    if (target[i] !== base[i]) {
                        valueSchema.diffBinary!(base[i], target[i], ws);
                        ++numPatch;
                        tracker |= 1 << (i & 7);
                    }

                    if ((i & 7) === 7) {
                        ws.writeUint8At(trackerOffset, tracker);
                        ++trackerOffset;
                        tracker = 0;
                    }
                }
        }

        if (targetLength & 7) {
            ws.writeUint8At(trackerOffset, tracker);
        }

        return numDelete > 0 || numPatch > 0;
    }

    public patchBinary (base:_MuArrayType<ValueSchema>, rs:MuReadStream) {
        const result = this.clone(base);

        const numDelete = rs.readUint32();
        result.length -= numDelete;

        const trackerBytes = rs.readUint32();

        let trackerOffset = rs.offset;
        rs.offset = trackerOffset + trackerBytes;

        const valueSchema = this.muData;
        const valueMuType = valueSchema.muType;
        let tracker = 0;
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
                // TODO do code generation instead
                const readMethod = muType2ReadMethod[valueMuType];
                for (let i = 0; i < trackerBytes; ++i) {
                    if (!(i & 7)) {
                        tracker = rs.readUint8At(trackerOffset);
                        ++trackerOffset;
                    }

                    if ((1 << (i & 7)) & tracker) {
                        result[i] = rs[readMethod]();
                    }
                }
                break;

            default:
                for (let i = 0; i < trackerBytes; ++i) {
                    if (!(i & 7)) {
                        tracker = rs.readUint8At(trackerOffset);
                        ++trackerOffset;
                    }

                    if ((1 << (i & 7)) & tracker) {
                        result[i] = valueSchema.patchBinary!(base[i], rs);
                    }
                }
        }

        return result;
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
