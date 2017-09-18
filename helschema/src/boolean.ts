import HelModel from './model';

function createBooleanSchema (value:boolean) : HelModel<boolean> {
    return {
        identity: value,
        _helType: 'boolean',

        alloc() { return value },
        free () { },
        clone (x:boolean) { return x },

        diff (a:boolean, b:boolean) {
            if (a !== b) {
                return b;
            }
            return;
        },
        patch (a:boolean, b:boolean) {
            return !!b;
        }
    };
}

const falseSchema = createBooleanSchema(false);
const trueSchema = createBooleanSchema(true);

export default function getBooleanSchema (value?:boolean) : HelModel<boolean> {
    if (value) {
        return trueSchema;
    }
    return falseSchema;
}