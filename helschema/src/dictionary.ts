import HelModel from './model';

class DictCacheEntry {
    public valueModel;
    public dictionaryModel;

    constructor (value, dict) {
        this.valueModel = value;
        this.dictionaryModel = dict;
    }
}

const dictionaryCache:DictCacheEntry[] = [];

function searchCache (valueModel) {
    for (let i = 0; i < dictionaryCache.length; ++i) {
        if (dictionaryCache[i].valueModel == valueModel) {
            return dictionaryCache[i].dictionaryModel;
        }
    }
    return null;
}

function insertCache (valueModel, dictionaryModel) {
    dictionaryCache.push(new DictCacheEntry(valueModel, dictionaryModel));
    return dictionaryModel;
}

export default function <ValueState> (
    valueModel:HelModel<ValueState>,
    identity?:{ [prop:string]:ValueState }) {
    type DictState = { [key:string]:ValueState };
    type DictModel = HelModel<DictState>;

    if (!identity) {
        const cachedEntry = searchCache(valueModel);
        if (cachedEntry) {
            return <DictModel>cachedEntry;
        }
    }

    let alloc = function () { return {} };

    if (identity) {
        alloc = function () { return clone(identity) };
    }

    function free(x:DictState) {
        Object.keys(x).forEach((prop) => {
            valueModel.free(x[prop]);        
        })
    };

    function clone(state:DictState) {
        const result = <DictState>{};
        Object.keys(state).forEach((prop) => {
            result[prop] = valueModel.clone(state[prop]);
        });
        return result;
    }
    
    function diff(base:DictState, target:DictState) {
        const remove:string[] = [];
        const patch:{ [prop:string]:any } = {};
    
        Object.keys(base).forEach((prop) => {
            if (prop in target) {
                const delta = valueModel.diff(base[prop], target[prop]);
                if (delta !== undefined) {
                    patch[prop] = delta;
                }
            } else {
                remove.push(prop);
            }
        });
    
        Object.keys(target).forEach((prop) => {
            if (!(prop in base)) {
                const d = valueModel.diff(valueModel.identity, target[prop]);
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
    
    function patch(base:DictState, delta:any) : DictState {
        const remove:string[] = delta.remove;
        const patch:{[prop:string]:any} = delta.patch;

        const result = {}
        Object.keys(base).forEach((prop) => {
            if (patch.remove.indexOf(prop) < 0) {
                if (patch.patch[prop]) {
                    result[prop] = valueModel.patch(base[prop], patch.patch[prop]);
                } else {
                    result[prop] = valueModel.clone(base[prop]);
                }
            }
        })
        return result;
    }

    const result = <DictModel>{
        identity: identity || {},
        _helType: `dictionary<${valueModel._helType}>`,
        alloc,
        clone,
        free,
        diff,
        patch,
    };

    if (!identity) {
        insertCache(valueModel, result);
    }
    return result;
};

