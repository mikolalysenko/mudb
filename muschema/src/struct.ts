import { MuSchema } from './schema';
import { MuWriteStream, MuReadStream } from 'mustreams';

const type2WriteMethod = {
    boolean: 'writeUint8',
    float32: 'writeFloat32',
    float64: 'writeFloat64',
    int8: 'writeInt8',
    int16: 'writeInt16',
    int32: 'writeInt32',
    string: 'writeString',
    uint8: 'writeUint8',
    uint16: 'writeUint16',
    uint32: 'writeUint32',
};

const type2ReadMethod = {
    boolean: 'readUint8',
    float32: 'readFloat32',
    float64: 'readFloat64',
    int8: 'readInt8',
    int16: 'readInt16',
    int32: 'readInt32',
    string: 'readString',
    uint8: 'readUint8',
    uint16: 'readUint16',
    uint32: 'readUint32',
};

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

    public readonly diff:(base:_MuStructT<StructSpec>, target:_MuStructT<StructSpec>) => any;
    public readonly patch:(base:_MuStructT<StructSpec>, patch:any) => _MuStructT<StructSpec>;

    public readonly diffBinary:(base:_MuStructT<StructSpec>, target:_MuStructT<StructSpec>, stream:MuWriteStream) => boolean;
    public readonly patchBinary:(base:_MuStructT<StructSpec>, stream:MuReadStream) => _MuStructT<StructSpec>;
    public readonly getByteLength:(value:_MuStructT<StructSpec>) => number;

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
                    return args[i];
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
            diff: func('diff', ['x', 'y']),
            patch: func('patch', ['x', 'p']),
            diffBinary: func('diffBinary', ['b', 't', 's']),
            patchBinary: func('patchBinary', ['b', 's']),
            getByteLength: func('getByteLength', ['x']),
        };

        const poolRef = prelude.def('[]');
        prelude.push('function MuStruct(){');
        structProps.forEach((propName, i) => {
            const type = structTypes[i];
            switch (type.muType) {
                case 'int8':
                case 'int16':
                case 'int32':
                case 'uint8':
                case 'uint16':
                case 'uint32':
                case 'float32':
                case 'float64':
                case 'boolean':
                    prelude.push(`this["${propName}"]=${type.identity};`);
                    break;
                case 'string':
                    prelude.push(`this["${propName}"]=${inject(type.identity)};`);
                    break;
                default:
                    prelude.push(`this["${propName}"]=null;`);
                    break;
            }
        });
        prelude.push(`}function _alloc(){if(${poolRef}.length > 0){return ${poolRef}.pop()}return new MuStruct()}`);

        const identityRef = prelude.def('_alloc()');
        structProps.forEach((propName, i) => {
            const type = structTypes[i];
            switch (type.muType) {
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
        structProps.forEach((propName, i) => {
            const type = structTypes[i];
            switch (type.muType) {
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
                    methods.alloc.push(`result["${propName}"]=${typeRefs[i]}.alloc();`);
                    break;
            }
        });
        methods.alloc.push(`return result`);

        // free subroutine
        methods.free.push(`${poolRef}.push(x);`);
        structProps.forEach((propName, i) => {
            const type = structTypes[i];
            switch (type.muType) {
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
                    methods.free.push(`${typeRefs[i]}.free(x["${propName}"]);`);
                    break;
            }
        });

        // clone subroutine
        methods.clone.push(`var result=_alloc();`);
        structProps.forEach((propName, i) => {
            const type = structTypes[i];
            switch (type.muType) {
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
                    methods.clone.push(`result["${propName}"]=x["${propName}"];`);
                    break;
                default:
                    methods.clone.push(`result["${propName}"]=${typeRefs[i]}.clone(x["${propName}"]);`);
                    break;
            }
        });
        methods.clone.push('return result');

        // diff subroutine
        const diffReqdRefs = structProps.map((name, i) => {
            const type = structTypes[i];
            switch (type.muType) {
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
                    return methods.diff.def(`${typeRefs[i]}.diff(x["${name}"],y["${name}"])`);
            }
        });
        methods.diff.push(`if(${diffReqdRefs.map((x) => x + '===void 0').join('&&') || 'true'}) return;var result = {};`);
        structProps.map((name, i) => {
            methods.diff.push(`if(${diffReqdRefs[i]}!==void 0){result["${name}"]=${diffReqdRefs[i]};}`);
        });
        methods.diff.push('return result;');

        // patch subroutine
        methods.patch.push(`if (!p) { return clone(x); } var result=_alloc();`);
        structProps.forEach((name, i) => {
            const type = structTypes[i];
            methods.patch.push(`if("${name}" in p){`);
            switch (type.muType) {
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
            methods.patch.push(`}else{`);
            switch (type.muType) {
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
            methods.patch.push('}');
        });
        methods.patch.push('return result;');

        // diffBinary subroutine
        const numProps = structProps.length;
        const trackerBytes = Math.ceil(numProps / 8);

        const dTrackerOffset = methods.diffBinary.def(0);
        const dTracker = methods.diffBinary.def(0);
        const numPatch = methods.diffBinary.def(0);
        methods.diffBinary.push(`${dTrackerOffset} = s.offset;s.grow(this.getByteLength(t)+${trackerBytes});s.offset+=${trackerBytes};`);
        structProps.forEach((propName, i) => {
            const muType = structTypes[i].muType;

            switch (muType) {
                case 'boolean':
                    methods.diffBinary.push(`if(b["${propName}"]!==t["${propName}"]){s.writeUint8(t["${propName}"]?1:0);++${numPatch};${dTracker}|=${1 << (i & 7)}}`);
                    break;
                case 'float32':
                case 'float64':
                case 'int8':
                case 'int16':
                case 'int32':
                case 'uint8':
                case 'uint16':
                case 'uint32':
                    methods.diffBinary.push(`if(b["${propName}"]!==t["${propName}"]){s.${type2WriteMethod[muType]}(t["${propName}"]);++${numPatch};${dTracker}|=${1 << (i & 7)}}`);
                    break;
                default:
                    methods.diffBinary.push(`if(${typeRefs[i]}.diffBinary(b["${propName}"],t["${propName}"],s)){++${numPatch};${dTracker}|=${1 << (i & 7)}}`);
            }

            if ((i & 7) === 7) {
                methods.diffBinary.push(`s.writeUint8At(${dTrackerOffset}+${i >> 3},${dTracker});${dTracker}=0;`);
            }
        });

        if (numProps & 7) {
            methods.diffBinary.push(`s.writeUint8At(${dTrackerOffset}+${trackerBytes - 1},${dTracker});`);
        }
        methods.diffBinary.push(`return ${numPatch}>0`);

        // patchBinary subroutine
        const pTrackerOffset = methods.patchBinary.def(0);
        const pTracker = methods.patchBinary.def(0);
        methods.patchBinary.push(`${pTrackerOffset}=s.offset;s.offset+=${trackerBytes};var result=clone(b);`);
        structProps.forEach((propName, i) => {
            if (!(i & 7)) {
                methods.patchBinary.push(`${pTracker}=s.readUint8At(${pTrackerOffset}+${i >> 3});`);
            }

            const muType = structTypes[i].muType;
            switch (muType) {
                case 'boolean':
                    methods.patchBinary.push(`if(${pTracker}&${1 << (i & 7)}){result["${propName}"]=!!s.readUint8()}`);
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
                    methods.patchBinary.push(`if(${pTracker}&${1 << (i & 7)}){result["${propName}"]=s.${type2ReadMethod[muType]}()}`);
                    break;
                default:
                    methods.patchBinary.push(`if(${pTracker}&${1 << (i & 7)}){result["${propName}"]=${typeRefs[i]}.patchBinary(b["${propName}"],s)}`);
            }
        });
        methods.patchBinary.push(`return result`);

        // getByteLength subroutine
        const byteLength = methods.getByteLength.def(0);
        let partialByteLength = 0;
        structProps.forEach((propName, i) => {
            const type = structTypes[i];
            switch (type.muType) {
                case 'boolean':
                case 'int8':
                case 'uint8':
                    ++partialByteLength;
                    break;
                case 'int16':
                case 'uint16':
                    partialByteLength += 2;
                    break;
                case 'float32':
                case 'int32':
                case 'uint32':
                    partialByteLength += 4;
                    break;
                case 'float64':
                    partialByteLength += 8;
                    break;
                case 'vector':
                    partialByteLength += type.identity.byteLength;
                    break;
                case 'string':
                    methods.getByteLength.push(`${byteLength}+=4+x["${propName}"].length*4;`);
                    break;
                default:
                    methods.getByteLength.push(`${byteLength}+=${typeRefs[i]}.getByteLength(x["${propName}"]);`);
            }
        });
        methods.getByteLength.push(`${byteLength}+=${trackerBytes + partialByteLength};return ${byteLength}`);

        const muDataRef = prelude.def('{}');
        structProps.forEach((propName, i) => {
            prelude.push(`${muDataRef}["${propName}"]=${typeRefs[i]};`);
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
        this.patch = compiled.patch;
        this.diff = compiled.diff;
        this.diffBinary = compiled.diffBinary;
        this.patchBinary = compiled.patchBinary;
        this.getByteLength = compiled.getByteLength;
    }
}
