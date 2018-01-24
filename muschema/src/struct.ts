import { MuSchema } from './schema';
import { MuWriteStream, MuReadStream } from 'mustreams';

import {
    muPrimitiveSize,
    muPrimitiveTypes,
    muType2ReadMethod,
    muType2WriteMethod,
} from './constants';

// tslint:disable-next-line:class-name
export interface _SchemaDictionary {
    [prop:string]:MuSchema<any>;
}

export type _MuStructT<StructSpec extends _SchemaDictionary> = {
    [P in keyof StructSpec]:StructSpec[P]['identity'];
};

export class MuStruct<StructSpec extends _SchemaDictionary>
        implements MuSchema<_MuStructT<StructSpec>> {
    public readonly muType = 'struct';
    public readonly muData:StructSpec;
    public readonly identity:_MuStructT<StructSpec>;
    public readonly json:object;

    public readonly alloc:() => _MuStructT<StructSpec>;
    public readonly free:(value:_MuStructT<StructSpec>) => void;
    public readonly clone:(value:_MuStructT<StructSpec>) => _MuStructT<StructSpec>;

    public readonly diff:(base:_MuStructT<StructSpec>, target:_MuStructT<StructSpec>, stream:MuWriteStream) => boolean;
    public readonly patch:(base:_MuStructT<StructSpec>, stream:MuReadStream) => _MuStructT<StructSpec>;

    constructor (spec:StructSpec) {
        // sort struct properties so primitives come first
        const structProps:string[] = Object.keys(spec).sort(
            (a:string, b:string) => {
                const ai = muPrimitiveTypes.indexOf(spec[a].muType);
                const bi = muPrimitiveTypes.indexOf(spec[b].muType);
                return (bi - ai) || (a < b ? -1 : (b < a) ? 1 : 0);
            });

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
                    return args[i];
                }
            }
            const result = token();
            args.push(result);
            props.push(x);
            return result;
        }

        const propRefs:string[] = structProps.map(inject);
        const typeRefs:string[] = structTypes.map(inject);

        function block () {
            const vars:string[] = [];
            const body:string[] = [];
            return {
                vars,
                body,
                toString () { //vars and body in string
                    const localVars = (vars.length > 0) ? `var ${vars.join()};` : '';
                    return localVars + body.join('');
                },
                def (value) { //vars.push('_vN'), body.push('_vN=value')
                    const tok = token();
                    vars.push(tok);
                    if (value != undefined) {
                        body.push(`${tok}=${value};`);
                    }
                    return tok;
                },
                push (...funcText:string[]) {
                    body.push.apply(body, funcText);
                },
            };
        }

        const prelude = block();
        const epilog = block();

        function func (name:string, params:string[]) {
            const b = block();
            const baseToString = b.toString;
            b.toString = function () {
                return `function ${name}(${params.join()}){${baseToString()}}`;
            };
            return b;
        }

        const methods = {
            alloc: func('alloc', []),
            free: func('free', ['x']),
            clone: func('clone', ['x']),
            diff: func('diff', ['b', 't', 's']),
            patch: func('patch', ['b', 's']),
        };

        const poolRef = prelude.def('[]');
        prelude.push('function MuStruct(){');
        propRefs.forEach((propRef, i) => {
            const type = structTypes[i];
            switch (type.muType) {
                case 'boolean':
                case 'float32':
                case 'float64':
                case 'int8':
                case 'int16':
                case 'int32':
                case 'uint8':
                case 'uint16':
                case 'uint32':
                    prelude.push(`this[${propRef}]=${type.identity};`);
                    break;
                case 'string':
                    prelude.push(`this[${propRef}]=${inject(type.identity)};`);
                    break;
                default:
                    prelude.push(`this[${propRef}]=null;`);
            }
        });
        prelude.push(`}function _alloc(){if(${poolRef}.length > 0){return ${poolRef}.pop()}return new MuStruct()}`);

        const identityRef = prelude.def('_alloc()');
        propRefs.forEach((propRef, i) => {
            const type = structTypes[i];
            switch (type.muType) {
                case 'boolean':
                case 'float32':
                case 'float64':
                case 'int8':
                case 'int16':
                case 'int32':
                case 'string':
                case 'uint8':
                case 'uint16':
                case 'uint32':
                    break;
                default:
                    prelude.push(`${identityRef}[${propRef}]=${typeRefs[i]}.clone(${inject(type.identity)});`);
                    break;
            }
        });

        // alloc subroutine
        methods.alloc.push(`var result=_alloc();`);
        propRefs.forEach((propRef, i) => {
            const type = structTypes[i];
            switch (type.muType) {
                case 'boolean':
                case 'float32':
                case 'float64':
                case 'int8':
                case 'int16':
                case 'int32':
                case 'string':
                case 'uint8':
                case 'uint16':
                case 'uint32':
                    break;
                default:
                    methods.alloc.push(`result[${propRef}]=${typeRefs[i]}.alloc();`);
                    break;
            }
        });
        methods.alloc.push(`return result`);

        // free subroutine
        methods.free.push(`${poolRef}.push(x);`);
        propRefs.forEach((propRef, i) => {
            const type = structTypes[i];
            switch (type.muType) {
                case 'boolean':
                case 'float32':
                case 'float64':
                case 'int8':
                case 'int16':
                case 'int32':
                case 'string':
                case 'uint8':
                case 'uint16':
                case 'uint32':
                    break;
                default:
                    methods.free.push(`${typeRefs[i]}.free(x[${propRef}]);`);
                    break;
            }
        });

        // clone subroutine
        methods.clone.push(`var result=_alloc();`);
        propRefs.forEach((propRef, i) => {
            const type = structTypes[i];
            switch (type.muType) {
                case 'boolean':
                case 'float32':
                case 'float64':
                case 'int8':
                case 'int16':
                case 'int32':
                case 'string':
                case 'uint8':
                case 'uint16':
                case 'uint32':
                    methods.clone.push(`result[${propRef}]=x[${propRef}];`);
                    break;
                default:
                    methods.clone.push(`result[${propRef}]=${typeRefs[i]}.clone(x[${propRef}]);`);
                    break;
            }
        });
        methods.clone.push('return result');

        // common constants
        const numProps = structProps.length;
        const trackerBytes = Math.ceil(numProps / 8);

        // diff subroutine
        const dTrackerOffset = methods.diff.def(0);
        const dTracker = methods.diff.def(0);
        const numPatch = methods.diff.def(0);

        let baseSize = trackerBytes;
        propRefs.forEach((p, i) => {
            const muType = structTypes[i].muType;
            if (muType in muPrimitiveSize) {
                baseSize += muPrimitiveSize[muType];
            }
        });

        methods.diff.push(`${dTrackerOffset}=s.offset;s.grow(${baseSize});s.offset+=${trackerBytes};`);
        propRefs.forEach((propRef, i) => {
            const muType = structTypes[i].muType;

            switch (muType) {
                case 'boolean':
                    methods.diff.push(`if(b[${propRef}]!==t[${propRef}]){s.writeUint8(t[${propRef}]?1:0);++${numPatch};${dTracker}|=${1 << (i & 7)}}`);
                    break;
                case 'float32':
                case 'float64':
                case 'int8':
                case 'int16':
                case 'int32':
                case 'uint8':
                case 'uint16':
                case 'uint32':
                    methods.diff.push(`if(b[${propRef}]!==t[${propRef}]){s.${muType2WriteMethod[muType]}(t[${propRef}]);++${numPatch};${dTracker}|=${1 << (i & 7)}}`);
                    break;
                default:
                    methods.diff.push(`if(${typeRefs[i]}.diff(b[${propRef}],t[${propRef}],s)){++${numPatch};${dTracker}|=${1 << (i & 7)}}`);
            }

            if ((i & 7) === 7) {
                methods.diff.push(`s.writeUint8At(${dTrackerOffset}+${i >> 3},${dTracker});${dTracker}=0;`);
            }
        });

        if (numProps & 7) {
            methods.diff.push(`s.writeUint8At(${dTrackerOffset}+${trackerBytes - 1},${dTracker});`);
        }
        // return the number of tracker bytes plus content bytes
        methods.diff.push(`if(${numPatch}){return true;}else{s.offset=${dTrackerOffset};return false;}`);

        // patch subroutine
        const pTrackerOffset = methods.patch.def('s.offset');
        const pTracker = methods.patch.def(0);
        methods.patch.push(`;s.offset+=${trackerBytes};var result=_alloc(b);`);
        propRefs.forEach((propRef, i) => {
            if (!(i & 7)) {
                methods.patch.push(`${pTracker}=s.readUint8At(${pTrackerOffset}+${i >> 3});`);
            }

            const muType = structTypes[i].muType;
            methods.patch.push(`;result[${propRef}]=(${pTracker}&${1 << (i & 7)})?`)
            switch (muType) {
                case 'boolean':
                    methods.patch.push(`!!s.readUint8():b[${propRef}];`);
                    break;
                case 'float32':
                case 'float64':
                case 'int8':
                case 'int16':
                case 'int32':
                case 'string':
                case 'uint8':
                case 'uint16':
                case 'uint32':
                    methods.patch.push(`s.${muType2ReadMethod[muType]}():b[${propRef}];`);
                    break;
                default:
                    methods.patch.push(`${typeRefs[i]}.patch(b[${propRef}],s):${typeRefs[i]}.clone(b[${propRef}]);`);
            }
        });
        methods.patch.push(`return result`);

        const muDataRef = prelude.def('{}');
        propRefs.forEach((propRef, i) => {
            prelude.push(`${muDataRef}[${propRef}]=${typeRefs[i]};`);
        });

        // write result
        epilog.push(`return {identity:${identityRef},muData:${muDataRef},`);
        Object.keys(methods).forEach((name) => {
            prelude.push(methods[name].toString());
            epilog.push(`${name},`);
        });
        epilog.push('}');
        prelude.push(epilog.toString());

        args.push(prelude.toString());
        const proc = Function.apply(null, args);
        const compiled = proc.apply(null, props);

        this.json = structJSON;
        this.muData = compiled.muData;
        this.identity = compiled.identity;
        this.alloc = compiled.alloc;
        this.free = compiled.free;
        this.clone = compiled.clone;
        this.diff = compiled.diff;
        this.patch = compiled.patch;
    }
}
