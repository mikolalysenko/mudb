import { MuSchema } from './schema';
import { MuWriteStream, MuReadStream } from '../stream';

const muPrimitiveSize = {
    boolean: 1,
    uint8: 1,
    uint16: 2,
    uint32: 4,
    int8: 1,
    int16: 2,
    int32: 4,
    float32: 4,
    float64: 8,
    varint: 5,
    rvarint: 5,
};

const muType2ReadMethod = {
    boolean: 'readUint8',
    float32: 'readFloat32',
    float64: 'readFloat64',
    int8: 'readInt8',
    int16: 'readInt16',
    int32: 'readInt32',
    uint8: 'readUint8',
    uint16: 'readUint16',
    uint32: 'readUint32',
    utf8: 'readString',
    varint: 'readVarint',
};

const muType2WriteMethod = {
    boolean: 'writeUint8',
    float32: 'writeFloat32',
    float64: 'writeFloat64',
    int8: 'writeInt8',
    int16: 'writeInt16',
    int32: 'writeInt32',
    uint8: 'writeUint8',
    uint16: 'writeUint16',
    uint32: 'writeUint32',
    utf8: 'writeString',
    varint: 'writeVarint',
};

const muPrimitiveTypes = Object.keys(muPrimitiveSize);

export type Struct<Spec extends { [propName:string]:MuSchema<any> }> = {
    [K in keyof Spec]:Spec[K]['identity'];
};

export class MuStruct<Spec extends { [propName:string]:MuSchema<any> }>
        implements MuSchema<Struct<Spec>> {
    public readonly muType = 'struct';
    public readonly muData:Spec;
    public readonly identity:Struct<Spec>;
    public readonly json:object;
    public pool:Struct<Spec>[];

    public readonly alloc:() => Struct<Spec>;
    public readonly free:(struct:Struct<Spec>) => void;

    public readonly equal:(a:Struct<Spec>, b:Struct<Spec>) => boolean;

    public readonly clone:(value:Struct<Spec>) => Struct<Spec>;
    public readonly assign:(dst:Struct<Spec>, src:Struct<Spec>) => Struct<Spec>;

    public readonly diff:(base:Struct<Spec>, target:Struct<Spec>, out:MuWriteStream) => boolean;
    public readonly patch:(base:Struct<Spec>, inp:MuReadStream) => Struct<Spec>;

    public readonly toJSON:(struct:Struct<Spec>) => Struct<any>;
    public readonly fromJSON:(json:Struct<any>) => Struct<Spec>;

    public readonly stats:() => {
        allocCount:number;
        freeCount:number;
        poolSize:number;
    };

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
            assign: func('assign', ['d', 's']),
            diff: func('diff', ['b', 't', 's']),
            patch: func('patch', ['b', 's']),
            toJSON: func('toJSON', ['s']),
            fromJSON: func('fromJSON', ['x']),
            stats: func('stats', []),
        };

        const allocCountRef = prelude.def('-1');
        const freeCountRef = prelude.def('0');
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
                case 'varint':
                case 'rvarint':
                    prelude.append(`this[${propRef}]=${type.identity};`);
                    break;
                case 'ascii':
                case 'fixed-ascii':
                case 'utf8':
                    prelude.append(`this[${propRef}]=${inject(type.identity)};`);
                    break;
                default:
                    prelude.append(`this[${propRef}]=null;`);
            }
        });
        prelude.append(`}function _alloc(){++${allocCountRef};if(${poolRef}.length > 0){return ${poolRef}.pop()}return new MuStruct()}`);

        const identityRef = prelude.def('_alloc()');
        propRefs.forEach((propRef, i) => {
            const type = structTypes[i];
            switch (type.muType) {
                case 'ascii':
                case 'fixed-ascii':
                case 'utf8':
                case 'boolean':
                case 'float32':
                case 'float64':
                case 'int8':
                case 'int16':
                case 'int32':
                case 'uint8':
                case 'uint16':
                case 'uint32':
                case 'varint':
                case 'rvarint':
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
                case 'fixed-ascii':
                case 'utf8':
                case 'boolean':
                case 'float32':
                case 'float64':
                case 'int8':
                case 'int16':
                case 'int32':
                case 'uint8':
                case 'uint16':
                case 'uint32':
                case 'varint':
                case 'rvarint':
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
                case 'fixed-ascii':
                case 'utf8':
                case 'boolean':
                case 'float32':
                case 'float64':
                case 'int8':
                case 'int16':
                case 'int32':
                case 'uint8':
                case 'uint16':
                case 'uint32':
                case 'varint':
                case 'rvarint':
                    break;
                default:
                    methods.free.append(`${typeRefs[i]}.free(x[${propRef}]);`);
                    break;
            }
        });
        methods.free.append(`++${freeCountRef}`);

        // equal subroutine
        propRefs.forEach((propRef, i) => {
            const type = structTypes[i];
            switch (type.muType) {
                case 'ascii':
                case 'fixed-ascii':
                case 'utf8':
                case 'boolean':
                case 'float32':
                case 'float64':
                case 'int8':
                case 'int16':
                case 'int32':
                case 'uint8':
                case 'uint16':
                case 'uint32':
                case 'varint':
                case 'rvarint':
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
                case 'fixed-ascii':
                case 'utf8':
                case 'boolean':
                case 'float32':
                case 'float64':
                case 'int8':
                case 'int16':
                case 'int32':
                case 'uint8':
                case 'uint16':
                case 'uint32':
                case 'varint':
                case 'rvarint':
                    methods.clone.append(`result[${propRef}]=x[${propRef}];`);
                    break;
                default:
                    methods.clone.append(`result[${propRef}]=${typeRefs[i]}.clone(x[${propRef}]);`);
                    break;
            }
        });
        methods.clone.append('return result');

        // assign subroutine
        propRefs.forEach((propRef, i) => {
            const type = structTypes[i];
            switch (type.muType) {
                case 'ascii':
                case 'fixed-ascii':
                case 'utf8':
                case 'boolean':
                case 'float32':
                case 'float64':
                case 'int8':
                case 'int16':
                case 'int32':
                case 'uint8':
                case 'uint16':
                case 'uint32':
                case 'varint':
                case 'rvarint':
                    methods.assign.append(`d[${propRef}]=s[${propRef}];`);
                    break;
                default:
                    methods.assign.append(`d[${propRef}]=${typeRefs[i]}.assign(d[${propRef}],s[${propRef}]);`);
            }
        });
        methods.assign.append('return d');

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
                    methods.diff.append(`if(b[${propRef}]!==t[${propRef}]){++${numPatch};${dTracker}|=${1 << (i & 7)}}`);
                    break;
                case 'float32':
                case 'float64':
                case 'int8':
                case 'int16':
                case 'int32':
                case 'uint8':
                case 'uint16':
                case 'uint32':
                case 'varint':
                case 'utf8':
                    methods.diff.append(`if(b[${propRef}]!==t[${propRef}]){s.${muType2WriteMethod[muType]}(t[${propRef}]);++${numPatch};${dTracker}|=${1 << (i & 7)}}`);
                    break;
                case 'rvarint':
                    methods.diff.append(`if(b[${propRef}]!==t[${propRef}]){s.writeVarint(0xAAAAAAAA+(t[${propRef}]-b[${propRef}])^0xAAAAAAAA);++${numPatch};${dTracker}|=${1 << (i & 7)}}`);
                    break;
                case 'ascii':
                    methods.diff.append(`if(b[${propRef}]!==t[${propRef}]){s.grow(5+t[${propRef}].length);s.writeVarint(t[${propRef}].length);s.writeASCII(t[${propRef}]);++${numPatch};${dTracker}|=${1 << (i & 7)}}`);
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
                case 'boolean':
                    methods.patch.append(`!b[${propRef}]:b[${propRef}];`);
                    break;
                case 'float32':
                case 'float64':
                case 'int8':
                case 'int16':
                case 'int32':
                case 'uint8':
                case 'uint16':
                case 'uint32':
                case 'utf8':
                case 'varint':
                    methods.patch.append(`s.${muType2ReadMethod[muType]}():b[${propRef}];`);
                    break;
                case 'rvaint':
                    methods.patch.append(`b[${propRef}]+((0xAAAAAAAA^s.readVarint())-0xAAAAAAAA>>0):b[${propRef}]`);
                    break;
                case 'ascii':
                    methods.patch.append(`s.readASCII(s.readVarint()):b[${propRef}];`);
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
        methods.fromJSON.append(`if(Object.prototype.toString.call(x)==='[object Object]'){`);
        propRefs.forEach((propRef, i) => {
            methods.fromJSON.append(`s[${propRef}]=${typeRefs[i]}.fromJSON(x[${propRef}]);`);
        });
        methods.fromJSON.append(`}`);
        methods.fromJSON.append(`return s`);

        // stats subroutine
        methods.stats.append(`return {allocCount:${allocCountRef},freeCount:${freeCountRef},poolSize:${poolRef}.length}`);

        const muDataRef = prelude.def('{}');
        propRefs.forEach((propRef, i) => {
            prelude.append(`${muDataRef}[${propRef}]=${typeRefs[i]};`);
        });

        // write result
        epilog.append(`return {identity:${identityRef},muData:${muDataRef},pool:${poolRef},`);
        Object.keys(methods).forEach((name) => {
            prelude.append(methods[name].toString());
            epilog.append(`${name}:${name},`);
        });
        epilog.append('}');
        prelude.append(epilog.toString());

        params.push(prelude.toString());
        const proc = Function.apply(null, params);
        const compiled = proc.apply(null, args);

        this.json = structJSON;
        this.muData = compiled.muData;
        this.identity = compiled.identity;
        this.pool = compiled.pool;

        this.alloc = compiled.alloc;
        this.free = compiled.free;
        this.equal = compiled.equal;
        this.clone = compiled.clone;
        this.assign = compiled.assign;
        this.diff = compiled.diff;
        this.patch = compiled.patch;
        this.toJSON = compiled.toJSON;
        this.fromJSON = compiled.fromJSON;
        this.stats = compiled.stats;
    }
}
