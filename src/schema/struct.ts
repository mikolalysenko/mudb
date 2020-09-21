import { MuSchema } from './schema';
import { MuWriteStream, MuReadStream } from '../stream';

const muPrimitiveSize = {
    boolean: 0,
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
    'quantized-float': 5,
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

export type Struct<Spec extends { [prop:string]:MuSchema<any> }> = {
    [K in keyof Spec]:Spec[K]['identity'];
};

export class MuStruct<Spec extends { [prop:string]:MuSchema<any> }> implements MuSchema<Struct<Spec>> {
    public readonly muType = 'struct';
    public readonly muData:Spec;
    public readonly identity:Struct<Spec>;
    public readonly json:object;
    public pool:Struct<Spec>[];

    public readonly alloc:() => Struct<Spec>;
    public readonly free:(struct:Struct<Spec>) => void;
    public readonly equal:(a:Struct<Spec>, b:Struct<Spec>) => boolean;
    public readonly clone:(struct:Struct<Spec>) => Struct<Spec>;
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
        const props:string[] = Object.keys(spec).sort(
            (a:string, b:string) => {
                const ai = muPrimitiveTypes.indexOf(spec[a].muType);
                const bi = muPrimitiveTypes.indexOf(spec[b].muType);
                return (bi - ai) || (a < b ? -1 : (b < a) ? 1 : 0);
            });
        const types:MuSchema<any>[] = props.map((prop) => spec[prop]);

        const json = {
            type: 'struct',
            subTypes: {},
        };
        props.forEach((prop) => {
            json.subTypes[prop] = spec[prop].json;
        });

        const params:string[] = [];
        const args:any[] = [];

        let tokenCounter = 0;
        function token () : string {
            return '_v' + (++tokenCounter);
        }

        function inject (arg) : string {
            for (let i = 0; i < args.length; ++i) {
                if (args[i] === arg) {
                    return params[i];
                }
            }
            const param = token();
            params.push(param);
            args.push(arg);
            return param;
        }

        const propRefs:string[] = props.map(inject);
        const typeRefs:string[] = types.map(inject);

        function block () {
            const vars:string[] = [];
            const body:string[] = [];
            return {
                vars,
                body,
                toString () {
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

        const prolog = block();
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
            free: func('free', ['s']),
            equal: func('equal', ['a', 'b']),
            clone: func('clone', ['s']),
            assign: func('assign', ['d', 's']),
            diff: func('diff', ['b', 't', 's']),
            patch: func('patch', ['b', 's']),
            toJSON: func('toJSON', ['s']),
            fromJSON: func('fromJSON', ['j']),
            stats: func('stats', []),
        };

        const allocCountRef = prolog.def('-1');
        const freeCountRef = prolog.def('0');
        const poolRef = prolog.def('[]');
        prolog.append('function MuStruct(){');
        propRefs.forEach((pr, i) => {
            const type = types[i];
            switch (type.muType) {
                case 'boolean':
                case 'int8':
                case 'int16':
                case 'int32':
                case 'uint8':
                case 'uint16':
                case 'uint32':
                case 'varint':
                case 'rvarint':
                    prolog.append(`this[${pr}]=${type.identity};`);
                    break;
                case 'float32':
                case 'float64':
                case 'quantized-float':
                    // ensure prop is initialized to float to mitigate perf issue caused by V8 migration
                    prolog.append(`this[${pr}]=0.5;this[${pr}]=${type.identity};`);
                    break;
                case 'ascii':
                case 'fixed-ascii':
                case 'utf8':
                    prolog.append(`this[${pr}]=${inject(type.identity)};`);
                    break;
                default:
                    prolog.append(`this[${pr}]=null;`);
            }
        });
        prolog.append(`}function _alloc(){++${allocCountRef};if(${poolRef}.length>0){return ${poolRef}.pop()}return new MuStruct()}`);

        const identityRef = prolog.def('_alloc()');
        propRefs.forEach((pr, i) => {
            const type = types[i];
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
                case 'quantized-float':
                    break;
                default:
                    prolog.append(`${identityRef}[${pr}]=${typeRefs[i]}.clone(${inject(type.identity)});`);
                    break;
            }
        });

        // alloc
        methods.alloc.append(`var s=_alloc();`);
        propRefs.forEach((pr, i) => {
            const type = types[i];
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
                case 'quantized-float':
                    break;
                default:
                    methods.alloc.append(`s[${pr}]=${typeRefs[i]}.alloc();`);
                    break;
            }
        });
        methods.alloc.append(`return s;`);

        // free
        methods.free.append(`${poolRef}.push(s);`);
        propRefs.forEach((pr, i) => {
            const type = types[i];
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
                case 'quantized-float':
                    break;
                default:
                    methods.free.append(`${typeRefs[i]}.free(s[${pr}]);`);
                    break;
            }
        });
        methods.free.append(`++${freeCountRef};`);

        // equal
        propRefs.forEach((pr, i) => {
            const type = types[i];
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
                    methods.equal.append(`if(a[${pr}]!==b[${pr}]){return false}`);
                    break;
                case 'quantized-float':
                    methods.equal.append(`if(((${(<any>type).invPrecision}*a[${pr}])>>0)!==((${(<any>type).invPrecision}*b[${pr}])>>0)){return false}`);
                    break;
                default:
                    methods.equal.append(`if(!${typeRefs[i]}.equal(a[${pr}],b[${pr}])){return false}`);
            }
        });
        methods.equal.append(`return true;`);

        // clone
        methods.clone.append(`var c=_alloc();`);
        propRefs.forEach((pr, i) => {
            const type = types[i];
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
                    methods.clone.append(`c[${pr}]=s[${pr}];`);
                    break;
                case 'quantized-float':
                    methods.clone.append(`c[${pr}]=((${(<any>type).invPrecision}*s[${pr}])>>0)*${(<any>type).precision};`);
                    break;
                default:
                    methods.clone.append(`c[${pr}]=${typeRefs[i]}.clone(s[${pr}]);`);
                    break;
            }
        });
        methods.clone.append('return c;');

        // assign
        propRefs.forEach((pr, i) => {
            const type = types[i];
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
                    methods.assign.append(`d[${pr}]=s[${pr}];`);
                    break;
                case 'quantized-float':
                    methods.assign.append(`d[${pr}]=((${(<any>type).invPrecision}*s[${pr}])>>0)*${(<any>type).precision};`);
                    break;
                default:
                    methods.assign.append(`d[${pr}]=${typeRefs[i]}.assign(d[${pr}],s[${pr}]);`);
            }
        });
        methods.assign.append('return d;');

        // common constants
        const numProps = props.length;
        const trackerBytes = Math.ceil(numProps / 8);

        // diff
        let baseSize = trackerBytes;
        for (let i = 0; i < types.length; ++i) {
            const muType = types[i].muType;
            if (muType in muPrimitiveSize) {
                baseSize += muPrimitiveSize[muType];
            }
        }

        methods.diff.append(`var head=s.offset;var tr=0;var np=0;s.grow(${baseSize});s.offset+=${trackerBytes};`);
        propRefs.forEach((pr, i) => {
            const muType = types[i].muType;
            switch (muType) {
                case 'boolean':
                    methods.diff.append(`if(b[${pr}]!==t[${pr}]){++np;tr|=${1 << (i & 7)}}`);
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
                    methods.diff.append(`if(b[${pr}]!==t[${pr}]){s.${muType2WriteMethod[muType]}(t[${pr}]);++np;tr|=${1 << (i & 7)}}`);
                    break;
                case 'rvarint':
                    methods.diff.append(`if(b[${pr}]!==t[${pr}]){s.writeVarint(0xAAAAAAAA+(t[${pr}]-b[${pr}])^0xAAAAAAAA);++np;tr|=${1 << (i & 7)}}`);
                    break;
                case 'ascii':
                    methods.diff.append(`if(b[${pr}]!==t[${pr}]){s.grow(5+t[${pr}].length);s.writeVarint(t[${pr}].length);s.writeASCII(t[${pr}]);++np;tr|=${1 << (i & 7)}}`);
                    break;
                case 'quantized-float':
                    const br = methods.diff.def(`(${(<any>types[i]).invPrecision}*b[${pr}])>>0`);
                    const tr = methods.diff.def(`(${(<any>types[i]).invPrecision}*t[${pr}])>>0`);
                    methods.diff.append(`if(${br}!==${tr}){s.writeVarint((0xAAAAAAAA+(${tr}-${br})^0xAAAAAAAA)>>>0);++np;tr|=${1 << (i & 7)};}`);
                    break;
                default:
                    methods.diff.append(`if(${typeRefs[i]}.diff(b[${pr}],t[${pr}],s)){++np;tr|=${1 << (i & 7)}}`);
            }

            if ((i & 7) === 7) {
                methods.diff.append(`s.writeUint8At(head+${i >> 3},tr);tr=0;`);
            }
        });

        if (numProps & 7) {
            methods.diff.append(`s.writeUint8At(head+${trackerBytes - 1},tr);`);
        }
        methods.diff.append(`if(np){return true}else{s.offset=head;return false}`);

        // patch
        methods.patch.append(`var t=_alloc(b);var head=s.offset;var tr=0;s.offset+=${trackerBytes};`);
        propRefs.forEach((pr, i) => {
            if (!(i & 7)) {
                methods.patch.append(`tr=s.readUint8At(head+${i >> 3});`);
            }

            const type = types[i];
            const muType = type.muType;
            methods.patch.append(`;t[${pr}]=(tr&${1 << (i & 7)})?`);
            switch (muType) {
                case 'boolean':
                    methods.patch.append(`!b[${pr}]:b[${pr}];`);
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
                    methods.patch.append(`s.${muType2ReadMethod[muType]}():b[${pr}];`);
                    break;
                case 'rvarint':
                    methods.patch.append(`b[${pr}]+((0xAAAAAAAA^s.readVarint())-0xAAAAAAAA>>0):b[${pr}];`);
                    break;
                case 'ascii':
                    methods.patch.append(`s.readASCII(s.readVarint()):b[${pr}];`);
                    break;
                case 'quantized-float':
                    methods.patch.append(`(((${(<any>type).invPrecision}*b[${pr}])>>0)+(((0xAAAAAAAA^s.readVarint())-0xAAAAAAAA)>>0))*${(<any>type).precision}:b[${pr}];`);
                    break;
                default:
                    methods.patch.append(`${typeRefs[i]}.patch(b[${pr}],s):${typeRefs[i]}.clone(b[${pr}]);`);
            }
        });
        methods.patch.append(`return t;`);

        // toJSON
        methods.toJSON.append(`var j={};`);
        propRefs.forEach((pr, i) => {
            methods.toJSON.append(`j[${pr}]=${typeRefs[i]}.toJSON(s[${pr}]);`);
        });
        methods.toJSON.append(`return j;`);

        // fromJSON
        methods.fromJSON.append(`var s=_alloc();`);
        methods.fromJSON.append(`if(Object.prototype.toString.call(j)==='[object Object]'){`);
        propRefs.forEach((pr, i) => {
            methods.fromJSON.append(`s[${pr}]=${typeRefs[i]}.fromJSON(j[${pr}]);`);
        });
        methods.fromJSON.append(`}`);
        methods.fromJSON.append(`return s;`);

        // stats
        methods.stats.append(`return {allocCount:${allocCountRef},freeCount:${freeCountRef},poolSize:${poolRef}.length};`);

        const muDataRef = prolog.def('{}');
        propRefs.forEach((pr, i) => {
            prolog.append(`${muDataRef}[${pr}]=${typeRefs[i]};`);
        });

        // write result
        epilog.append(`return {identity:${identityRef},muData:${muDataRef},pool:${poolRef},`);
        Object.keys(methods).forEach((name) => {
            prolog.append(methods[name].toString());
            epilog.append(`${name}:${name},`);
        });
        epilog.append('}');
        prolog.append(epilog.toString());

        params.push(prolog.toString());
        const proc = Function.apply(null, params);
        const compiled = proc.apply(null, args);

        this.json = json;
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
