import HelModel from './model';

export class HelDictionary<ValueType, ValueModel extends HelModel<ValueType>> implements HelModel<{[key:string]:ValueType}> {
    public readonly identity:{[key:string]:ValueType};
    
    public readonly helType = 'dictionary';
    public readonly helData:ValueModel;

    constructor (id:{[key:string]:ValueType}, valueSchema:ValueModel) {
        this.identity = id;
        this.helData = valueSchema;
    }

    alloc () { return {}; }

    free (x:{[key:string]:ValueType}) {}

    clone (x:{[key:string]:ValueType}):{[key:string]:ValueType} {
        const result:{[key:string]:ValueType} = {};
        const props = Object.keys(x);
        for (let i = 0; i < props.length; ++i) {
            result[props[i]] = x[props[i]];
        }
        return result;
    }

    diff (base:{[key:string]:ValueType}, target:{[key:string]:ValueType}) {
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

    patch (base:{[key:string]:ValueType}, {remove, patch}:{remove:string[], patch:{[key:string]:any}}) {
        const result = {}
        Object.keys(base).forEach((prop) => {
            if (patch.remove.indexOf(prop) < 0) {
                if (patch.patch[prop]) {
                    result[prop] = this.helData.patch(base[prop], patch.patch[prop]);
                } else {
                    result[prop] = this.helData.clone(base[prop]);
                }
            }
        })
        return result;
    }
}