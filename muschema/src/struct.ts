import { MuSchema } from './schema';

export interface _MuStructT<StructSpec extends { [prop:string]:MuSchema<any> }> {
    v:{
        [P in keyof StructSpec]: StructSpec[P]["identity"];
    };
};

export class MuStruct<StructSpec extends { [prop:string]:MuSchema<any> }> implements MuSchema<_MuStructT<StructSpec>['v']> {
    public readonly muType = 'struct';
    public readonly muData:StructSpec;
    public readonly identity:_MuStructT<StructSpec>['v'];
    public readonly json:object;

    public readonly alloc:() => _MuStructT<StructSpec>['v'];
    public readonly free:(value:_MuStructT<StructSpec>['v']) => void;
    public readonly clone:(value:_MuStructT<StructSpec>['v']) => _MuStructT<StructSpec>['v'];

    public readonly diff:(base:_MuStructT<StructSpec>['v'], target:_MuStructT<StructSpec>['v']) => any;
    public readonly patch:(base:_MuStructT<StructSpec>['v'], patch:any) => _MuStructT<StructSpec>['v'];

    constructor (spec:StructSpec) {
        const structProps:string[] = Object.keys(spec).sort();
        const structTypes:MuSchema<any>[] = structProps.map((propName) => spec[propName]);

        const structJSON = {
            type: 'struct',
            subTypes: {},
        };
        structProps.forEach((prop) => {
            structJSON.subTypes[prop] = spec[prop].json;
        });

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
            switch(type.muType) {
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
            switch(type.muType) {
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
        methods.alloc.push(`var result=_alloc();`);
        structProps.forEach((name, i) => {
            const type = structTypes[i];
            switch(type.muType) {
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
            switch(type.muType) {
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
        methods.clone.push(`var result = _alloc();`)
        structProps.forEach((name, i) => {
            const type = structTypes[i];
            switch(type.muType) {
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
            switch(type.muType) {
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
        methods.diff.push(`if(${diffReqdRefs.map((x) => x + '===void 0').join('&&')}) return;var result = {};`);
        structProps.map((name, i) => {
            methods.diff.push(`if(${diffReqdRefs[i]}!==void 0){result["${name}"]=${diffReqdRefs[i]};}`);
        });
        methods.diff.push('return result;');

        // patch subroutine
        methods.patch.push(`if (!p) { return clone(x); } var result=_alloc();`)
        structProps.forEach((name, i) => {
            const type = structTypes[i];
            methods.patch.push(`if("${name}" in p){`);
            switch(type.muType) {
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
            switch(type.muType) {
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
        epilog.push(`return {identity:${identityRef},`)
        Object.keys(methods).forEach((name) => {
            prelude.push(methods[name].toString());
            epilog.push(`${name}:${name},`)
        });
        epilog.push('}');
        prelude.push(epilog.toString());

        args.push(prelude.toString());
        const proc = Function.apply(null, args);
        const compiled = proc.apply(null, props);

        this.json = structJSON;
        this.muData = compiled;
        this.identity = compiled.identity;
        this.alloc = compiled.alloc;
        this.free = compiled.free;
        this.clone = compiled.clone;
        this.patch = compiled.patch;
        this.diff = compiled.diff;
    }
};
