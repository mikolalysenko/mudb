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

<<<<<<< HEAD
    public diff(base:ValueSchema['identity'][], target:ValueSchema['identity'][]) {
        const schema = this.muData;
        const result = new Array(target.length);
        let changed = base.length !== target.length;
        for (let i = 0; i < target.length; ++i) {
            if (i < base.length) {
                const p = schema.diff(base[i], target[i])
                if (typeof p !== undefined) {
                    changed = true;
=======
    public diff(base:ValueSchema['identity'][], target:ValueSchema['identity'][]|undefined) {
        let patch:{[index:string]:any} = {};
        if (!target) {
            patch = base;
            return patch;
        }
        const length:number = (base.length > target.length) ? base.length :target.length;

        for (let index = 0; index < length; index++) {
            if (base[index] === undefined && target[index] !== undefined) {
                patch[index] = this.muData.diff(this.muData.identity, target[index]);
            } else if (target[index] === undefined && base[index] !== undefined) {
                patch[index] = undefined;
            } else {
                const delta = this.muData.diff(base[index], target[index]);
                if (delta) {
                    patch[index] = delta;
>>>>>>> 127f187e626da0083bcd19444369bdcaf742a38c
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
<<<<<<< HEAD
        for (let i = 0; i < patch.length; ++i) {
            const x = patch[i];
            if (x === undefined || x === null) {
                if (i < base.length) {
                    result[i] = schema.clone(base[i]);
=======
        const patchProps:string[] = Object.keys(patch); // keys of patch, shows the indexs where are different
        const length = parseInt(patchProps[patchProps.length - 1]); // last index number in patch

        for (let i = 0; i <= length; i++) {
            if (patchProps.indexOf(i.toString()) < 0) { // no difference
                result.push(schema.clone(base[i]));
            } else if (patch[i]) { // different part
                if (base[i] === undefined || Object.keys(base[i]).length === 0) {
                    result.push(schema.clone(patch[i]));
>>>>>>> 127f187e626da0083bcd19444369bdcaf742a38c
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
