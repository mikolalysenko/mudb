import Model from './model';
import HelNumber from './number';

export default function createStruct <StructSpec extends { [prop:string]:Model<any,any> } > (spec:StructSpec, overrides?:{
    identity?:any,
    create?:any,
    clone?:any,
    free?:any,
    diff?:any,
    patch?:any,
    interpolate?:any,
}) {
    type StructConfig = {
        [P in keyof StructSpec]: any;
    };

    type StructState = {
        [P in keyof StructSpec]: StructSpec[P]["identity"];
    };

    type StructDelta = {
        [P in keyof StructSpec]?: StructSpec[P]["_delta"];
    };

    type StructModel = Model<StructState, StructDelta>;

    const args:string[] = [''];
    const props:any[] = [];
    const code:string[] = [];

    let tokenCounter = 0;

    function token () {
        return '_v' + (++tokenCounter);
    }

    function inject (x) {
        if (typeof x === 'object' || typeof x === 'function') {
            for (let i = 0; i < props.length; ++i) {
                if (props[i] === x) {
                    return args[i + 1]
                }
            }
            const result = token();
            args.push(result);
            props.push(x);
            return result;    
        } else {
            return '' + x;
        }
    }

    // emit identity element

    args[0] = code.join('');
    const proc = Function.apply(null, args);
    return <StructModel>proc.apply(props);
};
