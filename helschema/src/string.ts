import HelModel from './model';

function createStringSchema (value:string) : HelModel<string> {
    return {
        identity: value,
        _helType:'string',

        alloc() { return value },
        free (state:string) { },
        clone (state:string) { return state },
        
        diff (a:string, b:string) {
            if (a !== b) {
                return b;
            }
            return;
        },
        patch (a:string, b:any) {
            if (typeof b === 'string') {
                return b;
            }
            return '';
        }
    };
}

const schemaCache:{[key:string]:HelModel<string>} = {};

export default function getStringSchema (value?:string) {
    const defaultValue = value || '';
    if (defaultValue in schemaCache) {
        return schemaCache[defaultValue];
    }
    return schemaCache[defaultValue] = createStringSchema(defaultValue);
}