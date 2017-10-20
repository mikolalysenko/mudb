import { MuSchema } from './schema';

/** Union of subtype schemas */
export class MuUnion<SubTypes extends { [type:string]:MuSchema<any> }> implements MuSchema<{
    type:keyof SubTypes;
    data:SubTypes[keyof SubTypes]['identity'];
}> {
    public readonly identity:{
        type:keyof SubTypes;
        data:SubTypes[keyof SubTypes]['identity'];
    };

    public readonly muType = 'union';
    public readonly muData:SubTypes;
    public readonly json:object;

    constructor (
        schemaSpec:SubTypes,
        identityType?:keyof SubTypes) {
        this.muData = schemaSpec;

        if (identityType) {
            this.identity = {
                type: identityType,
                data: schemaSpec[identityType]
            };
        } else {
            this.identity = {
                type: '',
                data: void 0,
            }
        }

        const result = {};
        Object.keys(this.muData).forEach((subtype) => {
            result[subtype] = this.muData[subtype].json;
        });
        this.json = {
            type: 'union',
            identity: this.identity.type,
            data: result,
        };
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
        this.muData[data.type].free(data.data);
    }
    public clone (data:{
        type:keyof SubTypes;
        data:SubTypes[keyof SubTypes]['identity'];
    }) : {
        type:keyof SubTypes;
        data:SubTypes[keyof SubTypes]['identity'];
    } {
        const schema = this.muData[data.type];
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
        const model = this.muData[target.type];
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
            const model = this.muData[patch.type];
            return {
                type: patch.type,
                data: model.patch(model.identity, patch.data),
            };
        } else if ('data' in patch) {
            return {
                type: base.type,
                data: this.muData[base.type].patch(base.data, patch.data),
            };
        } else {
            return {
                type: base.type,
                data: this.muData[base.type].clone(base.data),
            };
        }
    }
}