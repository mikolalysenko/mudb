import { MuSchema } from './schema';
import { MuWriteStream, MuReadStream } from 'mustreams';

/** Array type schema */
export class MuArray<ValueSchema extends MuSchema<any>>
        implements MuSchema<ValueSchema['identity'][]> {
    public readonly identity:ValueSchema['identity'][];
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

    public alloc() { return this.identity; }

    public free(x:ValueSchema['identity'][]) { }

    public clone(x:ValueSchema['identity'][]) : ValueSchema['identity'][] {
        const result:ValueSchema['identity'][] = [];
        const schema = this.muData;
        x.forEach((valueSchema) => {
            result.push(schema.clone(valueSchema));
        });
        return result;
    }

    public diff(base:ValueSchema['identity'][], target:ValueSchema['identity'][]|undefined) {
        let patch:{[index:string]:any} = {};
        if (!target) {
            patch = base;
            return patch;
        }
        const length:number = (base.length > target.length) ? base.length :target.length;

        for (let index = 0; index < length; index++) {
            if (!base[index] && target[index]) {
                patch[index] = this.muData.diff(this.muData.identity, target[index]);
            } else if (!target[index] && base[index]) {
                patch[index] = undefined;
            } else {
                const delta = this.muData.diff(base[index], target[index]);
                if (delta) {
                    patch[index] = delta;
                }
            }
        }

        if (Object.keys(patch).length === 0) { return; }
        return patch;
     }

    public patch(base:ValueSchema['identity'][], patch:{[index:string]:any}|undefined) {
        if (!patch) {
            return this.clone(base);
        }

        const result:any = [];
        const schema = this.muData;
        const patchProps:string[] = Object.keys(patch); // keys of patch, shows the indexs where are different
        const length = parseInt(patchProps[patchProps.length - 1]); // last index number in patch

        for (let i = 0; i <= length; i++) {
            if (patchProps.indexOf(i.toString()) < 0) { // no difference
                result.push(schema.clone(base[i]));
            } else if (patch[i]) { // different part
                if (!base[i] || Object.keys(base[i]).length === 0) {
                    result.push(schema.clone(patch[i]));
                } else {
                    result.push(schema.patch(base[i], patch[i]));
                }
            }
        }

        return result;
     }

    // public diffBinary() { return false; } //TODO:

    // public patchBinary() { return false; } //TODO:
}
