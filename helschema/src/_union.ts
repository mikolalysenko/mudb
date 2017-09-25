import HelModel from './model';

export class HelUnion<SchemaSpec extends {
    [type:string]:HelModel<any>
}, StateType extends {
    type:string,
    data:any,   
}> implements HelModel<StateType> {
    public readonly identity:StateType;

    public readonly helType = 'union';
    public readonly helData:SchemaSpec;

    constructor (schemaSpec:SchemaSpec, identity:StateType) {
        this.helData = schemaSpec;
        this.identity = identity;
    }

    public alloc () : StateType {
        return <StateType>{
            type: '',
            data: null
        };
    }
    public free (data:StateType) {
        this.helData[data.type].free(data.data);
    }
    public clone (data:StateType) : StateType {
        const schema = this.helData[data.type];
        return <StateType>{
            type: data.type,
            data: schema.clone(data.data),
        }
    }

    public diff (base:StateType, target:StateType) : (any | undefined) {
        const model = this.helData[target.type];
        if (target.type === base.type) {
            const delta = model.diff(base.data, target.data);
            if (delta === void 0) {
                return;
            }
            return {
                data: delta
            };
        } else {
            return {
                type: target.type,
                data: model.diff(model.identity, target.data),
            };
        }
    }

    public patch (base:StateType, patch:any) : StateType {
        if ('type' in patch) {
            const model = this.helData[patch.type];
            return <StateType>{
                type: patch.type,
                data: model.patch(model.identity, patch.data),
            };
        } else if ('data' in patch) {
            return <StateType>{
                type: base.type,
                data: this.helData[base.type].patch(base.data, patch.data),
            };
        } else {
            return <StateType>{
                type: base.type,
                data: this.helData[base.type].clone(base.data),
            };
        }
    }
}