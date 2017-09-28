import { HelSchema } from './schema';

/** Union of subtype schemas */
export class HelUnion<SubTypes extends { [type:string]:HelSchema<any> }> implements HelSchema<{
    type:keyof SubTypes;
    data:SubTypes[keyof SubTypes]['identity'];
}> {
    public readonly identity:{
        type:keyof SubTypes;
        data:SubTypes[keyof SubTypes]['identity'];
    };

    public readonly helType = 'union';
    public readonly helData:SubTypes;

    constructor (schemaSpec:SubTypes, identity:{
        type:keyof SubTypes;
        data:SubTypes[keyof SubTypes]['identity'];
    }) {
        this.helData = schemaSpec;
        this.identity = identity;
    }

    public alloc () : {
        type:keyof SubTypes;
        data:SubTypes[keyof SubTypes]['identity'];
    } {
        return {
            type: '',
            data: null
        };
    }
    public free (data:{
        type:keyof SubTypes;
        data:SubTypes[keyof SubTypes]['identity'];
    }) {
        this.helData[data.type].free(data.data);
    }
    public clone (data:{
        type:keyof SubTypes;
        data:SubTypes[keyof SubTypes]['identity'];
    }) : {
        type:keyof SubTypes;
        data:SubTypes[keyof SubTypes]['identity'];
    } {
        const schema = this.helData[data.type];
        return {
            type: data.type,
            data: schema.clone(data.data),
        }
    }

    public diff (base:{
        type:keyof SubTypes;
        data:SubTypes[keyof SubTypes]['identity'];
    }, target:{
        type:keyof SubTypes;
        data:SubTypes[keyof SubTypes]['identity'];
    }) : (any | undefined) {
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

    public patch (base:{
        type:keyof SubTypes;
        data:SubTypes[keyof SubTypes]['identity'];
    }, patch:any) : {
        type:keyof SubTypes;
        data:SubTypes[keyof SubTypes]['identity'];
    } {
        if ('type' in patch) {
            const model = this.helData[patch.type];
            return {
                type: patch.type,
                data: model.patch(model.identity, patch.data),
            };
        } else if ('data' in patch) {
            return {
                type: base.type,
                data: this.helData[base.type].patch(base.data, patch.data),
            };
        } else {
            return {
                type: base.type,
                data: this.helData[base.type].clone(base.data),
            };
        }
    }
}