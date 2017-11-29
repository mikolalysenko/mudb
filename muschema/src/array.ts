import { MuSchema } from './schema';
import { MuWriteStream, MuReadStream } from 'mustreams';

/** Array type schema */
export class MuArray<ValueSchema extends MuSchema<any>>
        implements MuSchema<ValueSchema['identity'][]> {
    public readonly identity:ValueSchema['identity'][] = [];
    public readonly muType = 'array';
    public readonly muData:ValueSchema;
    public readonly json:object;

    constructor(valueSchema:ValueSchema, id?:ValueSchema['identity'][]) {
        this.identity = id || [];
        this.muData = valueSchema;
        this.json = {
            type: 'array',
            valueType: this.muData.json,
            identity: JSON.stringify(this.diff([], this.identity)),
        };
    }

    public alloc() { return this.identity.slice(); }

    public free(x:ValueSchema['identity'][]) { }

    public clone(x:ValueSchema['identity'][]) : ValueSchema['identity'][] {
        const result:ValueSchema['identity'][] = new Array(x.length);
        const schema = this.muData;
        for (let i = 0; i < x.length; ++i) {
            result[i] = schema.clone(x[i]);
        }
        return result;
    }

    public diff(base:ValueSchema['identity'][], target:ValueSchema['identity'][]) {
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

    public patch(base:ValueSchema['identity'][], patch:any[]|undefined) {
        if (!patch) {
            return this.clone(base);
        }
        const result:ValueSchema['identity'][] = new Array(patch.length);
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

    // public diffBinary() { return false; } //TODO:

    // public patchBinary() { return false; } //TODO:
}
