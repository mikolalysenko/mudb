import Model from './model';

export default function <ValueState, ValueDelta> (ValueModel:Model<ValueState, ValueDelta>) {
    type DictState = { [key:string]:ValueState };
    type DictDelta = {
        remove: string[];
        patch: { [key:string]:ValueDelta };
    };

    function alloc () {
        return {};
    }

    function free(x:DictState) {
        Object.keys(x).forEach((prop) => {
            ValueModel.free(x[prop]);        
        })
    };

    function clone(state:DictState) {
        const result = <DictState>{};
        Object.keys(state).forEach((prop) => {
            result[prop] = ValueModel.clone(state[prop]);
        });
        return result;
    }
    
    function diff(base:DictState, target:DictState) {
        const remove:string[] = [];
        const patch:{ [prop:string]:ValueDelta } = {};
    
        Object.keys(base).forEach((prop) => {
            if (prop in target) {

            } else {
                remove.push(prop);
            }
        });
    
        Object.keys(target).forEach((prop) => {
            if (!(prop in base)) {
                const d = ValueModel.diff(ValueModel.identity, target[prop]);
                if (d) {
                    patch[prop] = d;
                }
            }
        })

        if (remove.length === 0 && Object.keys(patch).length === 0) {
            return;
        }
    
        return <DictDelta>{
            remove,
            patch,
        };
    }
    
    function patch(base:DictState, patch:DictDelta) : DictState {
        const result = {}
        Object.keys(base).forEach((prop) => {
            if (patch.remove.indexOf(prop) < 0) {
                if (patch.patch[prop]) {
                    result[prop] = ValueModel.patch(base[prop], patch.patch[prop]);
                } else {
                    result[prop] = ValueModel.clone(base[prop]);
                }
            }
        })
        return result;
    }
    
    
    function interpolate(s0:DictState, t0:number, s1:DictState, t1:number, t:number) : DictState {
        const tf = (t - t0) / (t1 - t0);
        const result = {};

        if (tf < 0) {

        } else if (tf > 1) {
            
        } else {

        }

        return result;
    }    

    return < Model<DictState, DictDelta> >{
        identity: {},
        _delta: {
            remove: [],
            patch: {}
        },
        alloc,
        free,
        clone,
        diff,
        patch,
        interpolate,
    };
};

