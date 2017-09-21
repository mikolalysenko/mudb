import HelModel from './model';

function createNumberSchema (_helType:string, value:number) : HelModel<number> {
    return {
        identity: value,
        alloc () { return value },
        free (x:number) { },
        clone (x:number) { return x; },
        diff (s:number, t:number) {
            if (s !== t) {
                return t; 
            }
            return;
        },
        patch(s:number, p:number) { return p; },
        _helType
    };
}


const schemaCache:{ [helType:string]:{[defautlValue:number]:HelModel<number>} } = {};

export = function getNumberSchema(helType:string, value?:number) : HelModel<number> {
    let table = schemaCache[helType];
    if (!table) {
        table = schemaCache[helType] = {};
    }
    const defaultValue = value === void 0 ? 0 : value;
    if (defaultValue in table) {
        return table[defaultValue];
    }
    return table[defaultValue] = createNumberSchema(helType, defaultValue);
}
