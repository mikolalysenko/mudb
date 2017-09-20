import HelModel from './model';

export default function createUnionType<SubTypes extends {[key:string]:HelModel<any>}> (subtypes:SubTypes, defaultType?:keyof SubTypes) {
    type TypeKey = keyof SubTypes;
    type TypeValue = SubTypes[TypeKey];

    type UnionType = {
        type:TypeKey,
        data:TypeValue
    };
    type UnionModel = HelModel<UnionType>;

    // generate key index
    const keys:TypeKey[] = <TypeKey[]>Object.keys(subtypes).sort();
    const keyIndex:{ [key:string]:number } = {}
    for (let i = 0; i < keys.length; ++i) {
        keyIndex[keys[i]] = i;
    }

    const identityType:TypeKey = defaultType || keys[0];
    const identityModel = subtypes[identityType];
    const identityValue:UnionType = {
        type: identityType,
        data: identityModel.clone(identityModel.identity),
    };

    return {
        identity: identityValue,
        _helType: 'union',
        alloc() : UnionType {
            return {
                type: identityType,
                data: identityModel.alloc(),
            };
        },
        clone(state:UnionType) : UnionType {
            return {
                type: state.type,
                data: subtypes[state.type].clone(state.data),
            };
        },
        free(state:UnionType) {
            subtypes[state.type].free(state.data);
        },
        diff(base:UnionType, target:UnionType) : (any|undefined) {
            const model = subtypes[target.type];
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
                    type: keyIndex[target.type],
                    data: model.diff(model.identity, target.data),
                };
            }
        },
        patch(base:UnionType, patch:any) : UnionType {
            if ('type' in patch) {
                const type = keys[patch.type];
                const model = subtypes[type];
                return {
                    type,
                    data: model.patch(model.identity, patch.data),
                };
            } else if ('data' in patch) {
                return {
                    type: base.type,
                    data: subtypes[base.type].patch(base.data, patch.data),
                };
            } else {
                return {
                    type: base.type,
                    data: subtypes[base.type].clone(base.data),
                };
            }
        }
    };
}