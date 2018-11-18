import { MuSchema } from './schema';
import { MuWriteStream, MuReadStream } from '../stream';

import {
    muPrimitiveSize,
    muType2ReadMethod,
    muType2WriteMethod,
} from './constants';

const muPrimitiveTypes = Object.keys(muPrimitiveSize);

export type _Struct<Spec extends { [propName:string]:MuSchema<any> }> = {
    [K in keyof Spec]:Spec[K]['identity'];
};

export class MuStruct<Spec extends { [propName:string]:MuSchema<any> }>
        implements MuSchema<_Struct<Spec>> {
    public readonly muType = 'struct';
    public readonly muData:Spec;
    public readonly identity:_Struct<Spec>;
    public readonly json:object;

    public readonly alloc:() => _Struct<Spec>;
    public readonly free:(struct:_Struct<Spec>) => void;

    public readonly equal:(a:_Struct<Spec>, b:_Struct<Spec>) => boolean;

    public readonly clone:(value:_Struct<Spec>) => _Struct<Spec>;
    public readonly copy:(source:_Struct<Spec>, target:_Struct<Spec>) => void = (source, target) => {};

    public readonly diff:(base:_Struct<Spec>, target:_Struct<Spec>, out:MuWriteStream) => boolean;
    public readonly patch:(base:_Struct<Spec>, inp:MuReadStream) => _Struct<Spec>;

    public readonly toJSON:(struct:_Struct<Spec>) => _Struct<any>;
    public readonly fromJSON:(json:_Struct<any>) => _Struct<Spec>;

    constructor (spec:Spec) {
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

        const params:string[] = [];
        const args:any[] = [];

        let tokenCounter = 0;
        function token () : string {
            return '_v' + (++tokenCounter);
        }

        function inject (x) : string {
            for (let i = 0; i < args.length; ++i) {
                if (args[i] === x) {
                    return params[i];
                }
            }
            const result = token();
            params.push(result);
            args.push(x);
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
                append (...code:string[]) {
                    body.push.apply(body, code);
                },
            };
        }

        const prelude = block();
        const epilog = block();

        function func (name:string, params_:string[]) {
            const b = block();
            const baseToString = b.toString;
            b.toString = function () {
                return `function ${name}(${params_.join()}){${baseToString()}}`;
            };
            return b;
        }

        const methods = {
            alloc: func('alloc', []),
            free: func('free', ['x']),
            equal: func('equal', ['a', 'b']),
            clone: func('clone', ['x']),
            copy: func('copy', ['s', 't']),
            diff: func('diff', ['b', 't', 's']),
            patch: func('patch', ['b', 's']),
            toJSON: func('toJSON', ['s']),
            fromJSON: func('fromJSON', ['j']),
        };

        const poolRef = prelude.def('[]');
        prelude.append('function MuStruct(){');
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
                    prelude.append(`this[${propRef}]=${type.identity};`);
                    break;
                case 'ascii':
                case 'string':
                    prelude.append(`this[${propRef}]=${inject(type.identity)};`);
                    break;
                default:
                    prelude.append(`this[${propRef}]=null;`);
            }
        });
        prelude.append(`}function _alloc(){if(${poolRef}.length > 0){return ${poolRef}.pop()}return new MuStruct()}`);

        const identityRef = prelude.def('_alloc()');
        propRefs.forEach((propRef, i) => {
            const type = structTypes[i];
            switch (type.muType) {
                case 'ascii':
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
                    prelude.append(`${identityRef}[${propRef}]=${typeRefs[i]}.clone(${inject(type.identity)});`);
                    break;
            }
        });

        // alloc subroutine
        methods.alloc.append(`var result=_alloc();`);
        propRefs.forEach((propRef, i) => {
            const type = structTypes[i];
            switch (type.muType) {
                case 'ascii':
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
                    methods.alloc.append(`result[${propRef}]=${typeRefs[i]}.alloc();`);
                    break;
            }
        });
        methods.alloc.append(`return result`);

        // free subroutine
        methods.free.append(`${poolRef}.push(x);`);
        propRefs.forEach((propRef, i) => {
            const type = structTypes[i];
            switch (type.muType) {
                case 'ascii':
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
                    methods.free.append(`${typeRefs[i]}.free(x[${propRef}]);`);
                    break;
            }
        });

        // equal subroutine
        propRefs.forEach((propRef, i) => {
            const type = structTypes[i];
            switch (type.muType) {
                case 'ascii':
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
                    methods.equal.append(`if(a[${propRef}]!==b[${propRef}]){return false}`);
                    break;
                default:
                    methods.equal.append(`if(!${typeRefs[i]}.equal(a[${propRef}],b[${propRef}])){return false}`);
            }
        });
        methods.equal.append(`return true;`);

        // clone subroutine
        methods.clone.append(`var result=_alloc();`);
        propRefs.forEach((propRef, i) => {
            const type = structTypes[i];
            switch (type.muType) {
                case 'ascii':
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
                    methods.clone.append(`result[${propRef}]=x[${propRef}];`);
                    break;
                default:
                    methods.clone.append(`result[${propRef}]=${typeRefs[i]}.clone(x[${propRef}]);`);
                    break;
            }
        });
        methods.clone.append('return result');

        // copy subroutine
        propRefs.forEach((propRef, i) => {
            const type = structTypes[i];
            switch (type.muType) {
                case 'ascii':
                case 'boolean':
                case 'fixed-ascii':
                case 'float32':
                case 'float64':
                case 'int8':
                case 'int16':
                case 'int32':
                case 'string':
                case 'uint8':
                case 'uint16':
                case 'uint32':
                    methods.copy.append(`t[${propRef}]=s[${propRef}];`);
                    break;
                default:
                    methods.copy.append(`${typeRefs[i]}.copy(s[${propRef}],t[${propRef}]);`);
            }
        });

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

        methods.diff.append(`${dTrackerOffset}=s.offset;s.grow(${baseSize});s.offset+=${trackerBytes};`);
        propRefs.forEach((propRef, i) => {
            const muType = structTypes[i].muType;

            switch (muType) {
                case 'boolean':
                    methods.diff.append(`if(b[${propRef}]!==t[${propRef}]){s.writeUint8(t[${propRef}]?1:0);++${numPatch};${dTracker}|=${1 << (i & 7)}}`);
                    break;
                case 'float32':
                case 'float64':
                case 'int8':
                case 'int16':
                case 'int32':
                case 'uint8':
                case 'uint16':
                case 'uint32':
                    methods.diff.append(`if(b[${propRef}]!==t[${propRef}]){s.${muType2WriteMethod[muType]}(t[${propRef}]);++${numPatch};${dTracker}|=${1 << (i & 7)}}`);
                    break;
                default:
                    methods.diff.append(`if(${typeRefs[i]}.diff(b[${propRef}],t[${propRef}],s)){++${numPatch};${dTracker}|=${1 << (i & 7)}}`);
            }

            if ((i & 7) === 7) {
                methods.diff.append(`s.writeUint8At(${dTrackerOffset}+${i >> 3},${dTracker});${dTracker}=0;`);
            }
        });

        if (numProps & 7) {
            methods.diff.append(`s.writeUint8At(${dTrackerOffset}+${trackerBytes - 1},${dTracker});`);
        }
        methods.diff.append(`if(${numPatch}){return true;}else{s.offset=${dTrackerOffset};return false;}`);

        // patch subroutine
        const pTrackerOffset = methods.patch.def('s.offset');
        const pTracker = methods.patch.def(0);
        methods.patch.append(`;s.offset+=${trackerBytes};var result=_alloc(b);`);
        propRefs.forEach((propRef, i) => {
            if (!(i & 7)) {
                methods.patch.append(`${pTracker}=s.readUint8At(${pTrackerOffset}+${i >> 3});`);
            }

            const muType = structTypes[i].muType;
            methods.patch.append(`;result[${propRef}]=(${pTracker}&${1 << (i & 7)})?`);
            switch (muType) {
                case 'ascii':
                    methods.patch.append(`s.readASCII():b[${propRef}];`);
                    break;
                case 'boolean':
                    methods.patch.append(`!!s.readUint8():b[${propRef}];`);
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
                    methods.patch.append(`s.${muType2ReadMethod[muType]}():b[${propRef}];`);
                    break;
                default:
                    methods.patch.append(`${typeRefs[i]}.patch(b[${propRef}],s):${typeRefs[i]}.clone(b[${propRef}]);`);
            }
        });
        methods.patch.append(`return result`);

        // toJSON subroutine
        methods.toJSON.append(`var j={};`);
        propRefs.forEach((propRef, i) => {
            methods.toJSON.append(`j[${propRef}]=${typeRefs[i]}.toJSON(s[${propRef}]);`);
        });
        methods.toJSON.append(`return j`);

        // fromJSON subroutine
        methods.fromJSON.append(`var s=_alloc();`);
        propRefs.forEach((propRef, i) => {
            methods.fromJSON.append(`s[${propRef}]=${typeRefs[i]}.fromJSON(j[${propRef}]);`);
        });
        methods.fromJSON.append(`return s`);

        const muDataRef = prelude.def('{}');
        propRefs.forEach((propRef, i) => {
            prelude.append(`${muDataRef}[${propRef}]=${typeRefs[i]};`);
        });

        // write result
        epilog.append(`return {identity:${identityRef},muData:${muDataRef},`);
        Object.keys(methods).forEach((name) => {
            prelude.append(methods[name].toString());
            epilog.append(`${name},`);
        });
        epilog.append('}');
        prelude.append(epilog.toString());

        params.push(prelude.toString());
        const proc = Function.apply(null, params);
        const compiled = proc.apply(null, args);

        this.json = structJSON;
        this.muData = compiled.muData;
        this.identity = compiled.identity;
        this.alloc = compiled.alloc;
        this.free = compiled.free;
        this.equal = compiled.equal;
        this.clone = compiled.clone;
        this.copy = compiled.copy;
        this.diff = compiled.diff;
        this.patch = compiled.patch;
        this.toJSON = compiled.toJSON;
        this.fromJSON = compiled.fromJSON;
    }
}
