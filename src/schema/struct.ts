import { MuWriteStream, MuReadStream } from '../stream';
import { MuSchema } from './schema';
import { MuVector } from './vector';

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
                def (value:string) { //vars.push('_vN'), body.push('_vN=value')
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
            diff: func('diff', ['b', 't', 'ws']),
            patch: func('patch', ['b', 'rs']),
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
                    prolog.append(`this[${pr}]=${type.identity};`);
                    break;
                case 'ascii':
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
                case 'boolean':
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
                case 'rvarint':
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
                case 'boolean':
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
                case 'rvarint':
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
                case 'boolean':
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
                case 'rvarint':
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
                case 'boolean':
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
                case 'rvarint':
                    methods.equal.append(`if(a[${pr}]!==b[${pr}]){return false}`);
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
                case 'boolean':
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
                case 'rvarint':
                    methods.clone.append(`c[${pr}]=s[${pr}];`);
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
                case 'boolean':
                case 'fixed-ascii':
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
                case 'rvarint':
                    methods.assign.append(`d[${pr}]=s[${pr}];`);
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

        const muTypeToTypedArray = {
            float32: 'Float32Array',
            float64: 'Float64Array',
            int8: 'Int8Array',
            int16: 'Int16Array',
            int32: 'Int32Array',
            uint8: 'Uint8Array',
            uint16: 'Uint16Array',
            uint32: 'Uint32Array',
        };

        methods.diff.append(`var head=ws.offset;var tr=0;var np=0;ws.grow(${baseSize});ws.offset+=${trackerBytes};`);
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
                    methods.diff.append(`if(b[${pr}]!==t[${pr}]){ws.${muType2WriteMethod[muType]}(t[${pr}]);++np;tr|=${1 << (i & 7)}}`);
                    break;
                case 'rvarint':
                    methods.diff.append(`if(b[${pr}]!==t[${pr}]){ws.writeVarint(0xAAAAAAAA+(t[${pr}]-b[${pr}])^0xAAAAAAAA);++np;tr|=${1 << (i & 7)}}`);
                    break;
                case 'vector':
                    break;
                default:
                    methods.diff.append(`if(${typeRefs[i]}.diff(b[${pr}],t[${pr}],ws)){++np;tr|=${1 << (i & 7)}}`);
            }

            // vector member
            if (muType === 'vector') {
                const vector = <MuVector<any, any>>types[i];
                const TypedArray = muTypeToTypedArray[vector.muData.muType];
                const dimension = vector.dimension;
                const numTrackerBits = vector.identity.byteLength;

                const baseCache_ = prolog.def(`new ${TypedArray}(${dimension})`);
                const targetCache_ = prolog.def(`new ${TypedArray}(${dimension})`);
                const baseCache = prolog.def(`new Uint8Array(${baseCache_}.buffer)`);
                const targetCache = prolog.def(`new Uint8Array(${targetCache_}.buffer)`);

                const head = methods.diff.def('0');
                const offset = methods.diff.def('0');
                const numPatches = methods.diff.def('0');
                const tracker = methods.diff.def('0');

                methods.diff.append(
                    `${head}=${offset}=ws.offset;`,
                    `ws.grow(${Math.ceil(numTrackerBits * 9 / 8)});`,
                    `ws.offset+=${Math.ceil(numTrackerBits / 8)};`,
                    `${baseCache_}.set(b[${pr}]);${targetCache_}.set(t[${pr}]);`,
                );
                for (let j = 0; j < numTrackerBits; ++j) {
                    methods.diff.append(`if(${baseCache}[${j}]!==${targetCache}[${j}]){++${numPatches};${tracker}|=${1 << (j & 7)};ws.writeUint8(${targetCache}[${j}])}`);
                    if ((j & 7) === 7) {
                        methods.diff.append(`ws.writeUint8At(${offset}++,${tracker});${tracker}=0;`);
                    }
                }
                if (numTrackerBits & 7) {
                    methods.diff.append(`ws.writeUint8At(${offset},${tracker});`);
                }
                methods.diff.append(`if(${numPatches}>0){++np;tr|=${1 << (i & 7)}}else{ws.offset=${head}}`);
            }

            if ((i & 7) === 7) {
                methods.diff.append(`ws.writeUint8At(head+${i >> 3},tr);tr=0;`);
            }
        });

        if (numProps & 7) {
            methods.diff.append(`ws.writeUint8At(head+${trackerBytes - 1},tr);`);
        }
        methods.diff.append(`if(np){return true}else{ws.offset=head;return false}`);

        // patch
        methods.patch.append(`var t=_alloc();var head=rs.offset;var tr=0;rs.offset+=${trackerBytes};`);
        propRefs.forEach((pr, i) => {
            if (!(i & 7)) {
                methods.patch.append(`tr=rs.readUint8At(head+${i >> 3});`);
            }

            const muType = types[i].muType;
            switch (muType) {
                case 'ascii':
                    methods.patch.append(`t[${pr}]=(tr&${1 << (i & 7)})?rs.readASCII(rs.readVarint()):b[${pr}];`);
                    break;
                case 'boolean':
                    methods.patch.append(`t[${pr}]=(tr&${1 << (i & 7)})?!b[${pr}]:b[${pr}];`);
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
                    methods.patch.append(`t[${pr}]=(tr&${1 << (i & 7)})?rs.${muType2ReadMethod[muType]}():b[${pr}];`);
                    break;
                case 'rvarint':
                    methods.patch.append(`t[${pr}]=(tr&${1 << (i & 7)})?b[${pr}]+((0xAAAAAAAA^rs.readVarint())-0xAAAAAAAA>>0):b[${pr}];`);
                    break;
                case 'vector':
                    break;
                default:
                    methods.patch.append(`t[${pr}]=(tr&${1 << (i & 7)})?${typeRefs[i]}.patch(b[${pr}],rs):${typeRefs[i]}.clone(b[${pr}]);`);
            }

            // vector member
            if (muType === 'vector') {
                const vector = <MuVector<any, any>>types[i];
                const TypedArray = muTypeToTypedArray[vector.muData.muType];
                const dimension = vector.dimension;
                const numTrackerBits = vector.identity.byteLength;
                const numTrackerBytes = Math.ceil(numTrackerBits / 8);
                const numTrackerFullBytes = numTrackerBits / 8 | 0;
                const numPartialBits = numTrackerBits & 7;

                const cache_ = prolog.def(`new ${TypedArray}(${dimension})`);
                const cache = prolog.def(`new Uint8Array(${cache_}.buffer)`);

                const head = methods.patch.def('0');
                const tracker = methods.patch.def('0');

                methods.patch.append(`if(tr&${1 << (i & 7)}){${head}=rs.offset;rs.offset+=${numTrackerBytes};${cache_}.set(b[${pr}]);`);
                for (let j = 0; j < numTrackerFullBytes; ++j) {
                    const start = 8 * j;
                    methods.patch.append(`${tracker}=rs.readUint8At(${head}+${j});`);
                    for (let k = 0; k < 8; ++k) {
                        methods.patch.append(`if(${tracker}&${1 << k}){${cache}[${start + k}]=rs.readUint8()}`);
                    }
                }
                if (numPartialBits) {
                    const start = 8 * numTrackerFullBytes;
                    methods.patch.append(`${tracker}=rs.readUint8At(${head}+${numTrackerFullBytes});`);
                    for (let j = 0; j < numPartialBits; ++j) {
                        methods.patch.append(`if(${tracker}&${1 << j}){${cache}[${start + j}]=rs.readUint8()}`);
                    }
                }
                methods.patch.append(`t[${pr}]=${typeRefs[i]}.clone(${cache_})}`);
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
