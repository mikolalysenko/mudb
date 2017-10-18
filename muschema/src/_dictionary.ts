import { MuSchema } from './schema';

/** Dictionary type schema */
export class MuDictionary<ValueSchema extends MuSchema<any>> implements MuSchema<{[key:string]:ValueSchema['identity']}> {
    public readonly identity:{[key:string]:ValueSchema['identity']};
    
    public readonly muType = 'dictionary';
    public readonly muData:ValueSchema;
    public readonly json:object;

    constructor (id:{[key:string]:ValueSchema['identity']}, valueSchema:ValueSchema) {
        this.identity = id;
        this.muData = valueSchema;
        this.json = {
            type: 'dictionary',
            valueType: this.muData.json,
            identity: JSON.stringify(this.diff({}, this.identity)),
        };
    }

    alloc () { return {}; }

    free (x:{[key:string]:ValueSchema['identity']}) {}

    clone (x:{[key:string]:ValueSchema['identity']}):{[key:string]:ValueSchema['identity']} {
        const result:{[key:string]:ValueSchema['identity']} = {};
        const props = Object.keys(x);
        const schema = this.muData;
        for (let i = 0; i < props.length; ++i) {
            result[props[i]] = schema.clone(x[props[i]]);
        }
        return result;
    }

    diff (base:{[key:string]:ValueSchema['identity']}, target:{[key:string]:ValueSchema['identity']}) {
        const remove:string[] = [];
        const patch:{ [prop:string]:any } = {};
    
        Object.keys(base).forEach((prop) => {
            if (prop in target) {
                const delta = this.muData.diff(base[prop], target[prop]);
                if (delta !== undefined) {
                    patch[prop] = delta;
                }
            } else {
                remove.push(prop);
            }
        });
    
        Object.keys(target).forEach((prop) => {
            if (!(prop in base)) {
                const d = this.muData.diff(this.muData.identity, target[prop]);
                if (d) {
                    patch[prop] = d;
                }
            }
        })

        if (remove.length === 0 && Object.keys(patch).length === 0) {
            return;
        }
    
        return {
            remove,
            patch,
        };
    }

    patch (base:{[key:string]:ValueSchema['identity']}, {remove, patch}:{remove:string[], patch:{[key:string]:any}}) {
        const result = {}
        const schema = this.muData;

        const baseProps = Object.keys(base);
        for (let i = 0; i < baseProps.length; ++i) {
            const prop = baseProps[i];
            if (remove.indexOf(prop) < 0) {
                if (prop in patch) {
                    result[prop] = schema.patch(base[prop], patch[prop]);
                } else {
                    result[prop] = schema.clone(base[prop]);
                }
            }
        }

        const patchProps = Object.keys(patch);
        for (let i = 0; i < patchProps.length; ++i) {
            const prop = patchProps[i];
            if (!(prop in base)) {
                result[prop] = schema.patch(schema.identity, patch[prop]);
            }
        }

        return result;
    }
}