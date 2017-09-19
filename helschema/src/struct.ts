import HelModel from './model';

class CachedStructModel {
    public props:string[];
    public types:any[];
    public model:any;

    constructor (props, types, model) {
        this.props = props;
        this.types = types;
        this.model = model;
    }
};

const structCache:{ [key:string]:CachedStructModel[] } = {};

function searchCache (props:string[], types:any[]) : any {
    const cacheLine = structCache[props.join()];
    if (!cacheLine) {
        return null;
    }

    for (let i = 0; i < cacheLine.length; ++i) {
        const entry = cacheLine[i];
        if (entry.props.length !== props.length) {
            return null;
        }
        for (let j = 0; j < entry.props.length; ++j) {
            if (entry.props[j] !== props[j] ||
                entry.types[j] !== types[j]) {
                return null;
            }
        }
        return entry.model;
    }

    return null;
}

function insertCache (props:string[], types:any[], model:any) {
    const entry = new CachedStructModel(props, types, model);
    const key = props.join();
    if (key in structCache) {
        structCache[key].push(entry);
    } else {
        structCache[key] = [ entry ];
    }
    return model;
}

export default function createStruct <StructSpec extends { [prop:string]:HelModel<any> } > (spec:StructSpec) {
    type StructState = {
        [P in keyof StructSpec]: StructSpec[P]["identity"];
    };
    type StructModel = HelModel<StructState>;

    const structProps:string[] = Object.keys(spec).sort();
    const structTypes:HelModel<any>[] = structProps.map((propName) => spec[propName]);

    const cachedEntry = searchCache(structProps, structTypes);
    if (cachedEntry) {
        return <StructModel>cachedEntry;
    }

    const args:string[] = [];
    const props:any[] = [];

    let tokenCounter = 0;

    function token () : string {
        return '_v' + (++tokenCounter);
    }

    function inject (x) : string {
        for (let i = 0; i < props.length; ++i) {
            if (props[i] === x) {
                return args[i]
            }
        }
        const result = token();
        args.push(result);
        props.push(x);
        return result;    
    }

    const typeRefs:string[] = structTypes.map(inject);

    function block () {
        const vars:string[] = [];
        const body:string[] = [];
        return {
            vars,
            body,
            toString() {
                const result:string[] = [];
                if (vars.length > 0) {
                    result.push(`var ${vars.join()};`);
                }
                return result.join('') + body.join('');
            },
            def(value) {
                const tok = token();
                vars.push(tok);
                if (value) {
                    body.push(`${tok}=${value};`)
                }
                return tok;
            },
            push(...args:string[]) {
                body.push.apply(this.body, args);
            }
        };
    }

    const prelude = block();
    const epilog = block();

    function func (name:string, args:string[]) {
        const b = block();
        const baseToString = b.toString;
        b.toString = function () {
            return `function ${name}(${args.join()}){${baseToString()}};`
        }
        return b;
    }

    const methods = {
        alloc: func('alloc', []),
        free: func('free', ['x']),
        clone: func('clone', ['x']),
        diff: func('diff', ['x', 'y']),
        patch: func('patch', ['x', 'p']),
    };

    const poolRef = prelude.def('[]');
    prelude.push('function HelStruct(){');
    structProps.forEach((name, i) => {
        const type = structTypes[i];
        switch(type._helType) {
            case 'int8':
            case 'int16':
            case 'int32':
            case 'uint8':
            case 'uint16':
            case 'uint32':
            case 'float32':
            case 'float64':
            case 'boolean':
                prelude.push(`this["${name}"]=${type.identity};`);
                break;
            case 'string':
                prelude.push(`this["${name}"]=${inject(type.identity)};`);
                break;
            default:
                prelude.push(`this["${name}"]=null;`);
                break;
        }
    });
    prelude.push(`}; function _alloc() { if(${poolRef}.length > 0) { return ${poolRef}.pop(); } return new HelStruct(); }`)


    const identityRef = prelude.def('_alloc()');
    structProps.forEach((propName, i) => {
        const type = structTypes[i];
        switch(type._helType) {
            case 'int8':
            case 'int16':
            case 'int32':
            case 'uint8':
            case 'uint16':
            case 'uint32':
            case 'float32':
            case 'float64':
            case 'boolean':
            case 'string':
                break;
            default:
                prelude.push(`${identityRef}["${propName}"]=${typeRefs[i]}.clone(${inject(type.identity)});`);
                break;
        }
    });

    // alloc subroutine
    methods.alloc.push(`result=_alloc();`);
    structProps.forEach((name, i) => {
        const type = structTypes[i];
        switch(type._helType) {
            case 'int8':
            case 'int16':
            case 'int32':
            case 'uint8':
            case 'uint16':
            case 'uint32':
            case 'float32':
            case 'float64':
            case 'string':
            case 'boolean':
                break;
            default:
                methods.alloc.push(`result["${name}"]=${typeRefs[i]}.alloc();`);
                break;
        }
    });
    methods.alloc.push(`return result`);

    // free subroutine
    methods.free.push(`${poolRef}.push(x);`)
    structProps.forEach((name, i) => {
        const type = structTypes[i];
        switch(type._helType) {
            case 'int8':
            case 'int16':
            case 'int32':
            case 'uint8':
            case 'uint16':
            case 'uint32':
            case 'float32':
            case 'float64':
            case 'string':
            case 'boolean':
                break;
            default:
                methods.free.push(`${typeRefs[i]}.free(x["${name}"]);`);
                break;
        }
    });

    // clone subroutine
    methods.clone.push(`const result = _alloc();`)
    structProps.forEach((name, i) => {
        const type = structTypes[i];
        switch(type._helType) {
            case 'int8':
            case 'int16':
            case 'int32':
            case 'uint8':
            case 'uint16':
            case 'uint32':
            case 'float32':
            case 'float64':
            case 'string':
            case 'boolean':
                methods.clone.push(`result["${name}"] = x["${name}"];`);
                break;
            default:
                methods.clone.push(`result["${name}"] = ${typeRefs[i]}.clone(x["${name}"]);`);
                break;
        }
    });
    methods.clone.push('return result');

    // diff subroutine
    const diffReqdRefs = structProps.map((name, i) => {
        const type = structTypes[i];
        switch(type._helType) {
            case 'int8':
            case 'int16':
            case 'int32':
            case 'uint8':
            case 'uint16':
            case 'uint32':
            case 'float32':
            case 'float64':
            case 'boolean':
                return methods.diff.def(`x["${name}"] !== y["${name}"]?y["${name}"]:void 0`);
            default:
                return methods.diff.def(`${typeRefs[i]}.diff(x["${name}"],y["${name}"])`)
        }
    });
    methods.diff.push(`if(${diffReqdRefs.map((x) => x + '===void 0').join('&&')}) return;const result = {};`);
    structProps.map((name, i) => {
        methods.diff.push(`if(${diffReqdRefs[i]}!==void 0){result["${name}"]=${diffReqdRefs[i]};}`);
    });
    methods.diff.push('return result;');

    // patch subroutine
    methods.patch.push(`if (!p) { return clone(x); } const result=_alloc();`)
    structProps.forEach((name, i) => {
        const type = structTypes[i];
        methods.patch.push(`if("${name}" in p){`);
        switch(type._helType) {
            case 'int8':
            case 'int16':
            case 'int32':
            case 'uint8':
            case 'uint16':
            case 'uint32':
            case 'float32':
            case 'float64':
            case 'boolean':
                methods.patch.push(`result["${name}"]=p["${name}"];`);
                break;
            default:
                methods.patch.push(`result["${name}"]=${typeRefs[i]}.patch(x["${name}"], p["${name}"]);`);
                break;
        }
        methods.patch.push(`}else{`)
        switch(type._helType) {
            case 'int8':
            case 'int16':
            case 'int32':
            case 'uint8':
            case 'uint16':
            case 'uint32':
            case 'float32':
            case 'float64':
            case 'boolean':
                methods.patch.push(`result["${name}"]=x["${name}"];`);
                break;
            default:
                methods.patch.push(`result["${name}"]=${typeRefs[i]}.clone(x["${name}"]);`);
                break;
        }
        methods.patch.push('}')
    });
    methods.patch.push('return result;');

    // write result
    epilog.push(`return {identity:${identityRef},_helType:"struct",`)
    Object.keys(methods).forEach((name) => {
        prelude.push(methods[name].toString());
        epilog.push(`${name}:${name},`)
    });
    epilog.push('}');
    prelude.push(epilog.toString());

    args.push(prelude.toString());
    const proc = Function.apply(null, args);

    // console.log(args)
    return <StructModel>insertCache(structProps, structTypes, proc.apply(null, props));
};
