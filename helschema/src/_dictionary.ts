import { HelSchema } from './schema';

export class HelDictionary<ValueSchema extends HelSchema<any>> implements HelSchema<{[key:string]:ValueSchema['identity']}> {
    public readonly identity:{[key:string]:ValueSchema['identity']};
    
    public readonly helType = 'dictionary';
    public readonly helData:ValueSchema;

    constructor (id:{[key:string]:ValueSchema['identity']}, valueSchema:ValueSchema) {
        this.identity = id;
        this.helData = valueSchema;
    }

    alloc () { return {}; }

    free (x:{[key:string]:ValueSchema['identity']}) {}

    clone (x:{[key:string]:ValueSchema['identity']}):{[key:string]:ValueSchema['identity']} {
        const result:{[key:string]:ValueSchema['identity']} = {};
        const props = Object.keys(x);
        for (let i = 0; i < props.length; ++i) {
            result[props[i]] = x[props[i]];
        }
        return result;
    }

    diff (base:{[key:string]:ValueSchema['identity']}, target:{[key:string]:ValueSchema['identity']}) {
        const remove:string[] = [];
        const patch:{ [prop:string]:any } = {};
    
        Object.keys(base).forEach((prop) => {
            if (prop in target) {
                const delta = this.helData.diff(base[prop], target[prop]);
                if (delta !== undefined) {
                    patch[prop] = delta;
                }
            } else {
                remove.push(prop);
            }
        });
    
        Object.keys(target).forEach((prop) => {
            if (!(prop in base)) {
                const d = this.helData.diff(this.helData.identity, target[prop]);
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
        const schema = this.helData;

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