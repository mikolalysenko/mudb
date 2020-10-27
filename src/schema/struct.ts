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
                case 'quantized-vec2':
                case 'quantized-vec3':
                case 'quantized-vec4':
                    const ip = inject(`${(<any>type).invPrecision}`);
                    const qva = methods.equal.def(`a[${pr}]`);
                    const qvb = methods.equal.def(`b[${pr}]`);
                    methods.equal.append(`if(`);
                    for (let idx = 0; idx < type.identity.length; idx++) {
                        let code = `(${ip}*${qva}[${idx}]>>0)!==(${ip}*${qvb}[${idx}]>>0)`;
                        if (idx !== 0) {
                            code = '||' + code;
                        }
                        methods.equal.append(code);
                    }
                    methods.equal.append(`){return false}`);
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
                case 'quantized-vec2':
                case 'quantized-vec3':
                case 'quantized-vec4':
                    methods.clone.append(`c[${pr}]=${typeRefs[i]}.assign(${typeRefs[i]}.alloc(),s[${pr}]);`);
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
                case 'quantized-vec2':
                case 'quantized-vec3':
                case 'quantized-vec4':
                    const ip = inject((<any>type).invPrecision);
                    const p = inject((<any>type).precision);
                    for (let idx = 0; idx < type.identity.length; idx++) {
                        methods.assign.append(`d[${pr}][${idx}]=((${ip}*s[${pr}][${idx}])>>0)*${p};`);
                    }
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
            const type = types[i];
            const muType = type.muType;
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
                case 'quantized-vec2':
                case 'quantized-vec3':
                case 'quantized-vec4':
                    const length = type.identity.length;
                    const numPrefixBits = length + 1;
                    const numPackedBits = 8 - numPrefixBits;

                    const writeVarintWithPrefix = func('wvwp', ['pp', 'x', 's']);
                    writeVarintWithPrefix.append(
                        `var x0=x&${(1 << numPackedBits) - 1};`,
                        `var x1=x>>>${numPackedBits};`,
                        `var pr=(x1?${1 << length}:0)|pp;`,
                        `s.writeUint8((pr<<${numPackedBits})|x0);`,
                        `if(x1){s.writeVarint(x1)}`,
                    );
                    const wvwp = inject(Function(writeVarintWithPrefix.toString()));

                    const sch = inject(0xAAAAAAAA);
                    const ip = inject((<any>type).invPrecision);

                    const qvb = methods.diff.def(`b[${pr}]`);
                    const qvt = methods.diff.def(`t[${pr}]`);

                    const bx = methods.diff.def(`(${ip}*${qvb}[0])>>0`);
                    const tx = methods.diff.def(`(${ip}*${qvt}[0])>>0`);
                    const by = methods.diff.def(`(${ip}*${qvb}[1])>>0`);
                    const ty = methods.diff.def(`(${ip}*${qvt}[1])>>0`);
                    let bz;
                    let tz;
                    let bw;
                    let tw;
                    if (length > 2) {
                        bz = methods.diff.def(`(${ip}*${qvb}[2])>>0`);
                        tz = methods.diff.def(`(${ip}*${qvt}[2])>>0`);
                    }
                    if (length > 3) {
                        bw = methods.diff.def(`(${ip}*${qvb}[3])>>0`);
                        tw = methods.diff.def(`(${ip}*${qvt}[3])>>0`);
                    }

                    const dx = methods.diff.def(0);
                    const dy = methods.diff.def(0);
                    let dz;
                    let dw;
                    (length > 2) && (dz = methods.diff.def(0));
                    (length > 3) && (dw = methods.diff.def(0));

                    methods.diff.append(`if(${bx}!==${tx}||${by}!==${ty}`);
                    (length > 2) && methods.diff.append(`||${bz}!==${tz}`);
                    (length > 3) && methods.diff.append(`||${bw}!==${tw}`);
                    methods.diff.append(`){++np;tr|=${1 << (i & 7)};${dx}=(${sch}+(${tx}-${bx})^${sch})>>>0;${dy}=(${sch}+(${ty}-${by})^${sch})>>>0;`);
                    (length > 2) && methods.diff.append(`${dz}=(${sch}+(${tz}-${bz})^${sch})>>>0;`);
                    (length > 3) && methods.diff.append(`${dw}=(${sch}+(${tw}-${bw})^${sch})>>>0;`);

                    const pp = methods.diff.def(0);
                    methods.diff.append(`${pp}=(${dx}?1:0)|(${dy}?2:0)`);
                    (length > 2) && methods.diff.append(`|(${dz}?4:0)`);
                    (length > 3) && methods.diff.append(`|(${dw}?8:0)`);
                    methods.diff.append(`;s.grow(21);`);

                    methods.diff.append(`if(${dx}){${wvwp}(${pp},${dx},s);${dy}&&s.writeVarint(${dy});`);
                    (length > 2) && methods.diff.append(`${dz}&&s.writeVarint(${dz});`);
                    (length > 3) && methods.diff.append(`${dw}&&s.writeVarint(${dw});`);
                    (length === 3) && methods.diff.append(`}else if(${dy}){${wvwp}(${pp},${dy},s);${dz}&&s.writeVarint(${dz});`);
                    (length === 4) && methods.diff.append(`}else if(${dy}){${wvwp}(${pp},${dy},s);${dz}&&s.writeVarint(${dz});${dw}&&s.writeVarint(${dw});}else if(${dz}){${wvwp}(${pp},${dz},s);${dw}&&s.writeVarint(${dw});`);
                    methods.diff.append(`}else{${wvwp}(${pp},${length === 2 ? dy : length === 3 ? dz : dw},s)}`);
                    methods.diff.append(`}`);
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
            if (muType === 'quantized-vec2' || muType === 'quantized-vec3' || muType === 'quantized-vec4') {
                const length = type.identity.length;
                const numPrefixBits = length + 1;
                const numPackedBits = 8 - numPrefixBits;

                const readShroeppel = func('rs', ['s']);
                readShroeppel.append(`return ((0xAAAAAAAA^s.readVarint())-0xAAAAAAAA)>>0;`);
                const rs = inject(Function(readShroeppel.toString()));

                const readShroeppelWithPrefix = func('rswp', ['p', 's']);
                readShroeppelWithPrefix.append(
                    `var x=p&${(1 << numPackedBits) - 1};`,
                    `if(p&128){x+=s.readVarint()<<${numPackedBits};}`,
                    `return (0xAAAAAAAA^x)-0xAAAAAAAA>>0;`,
                );
                const rswp = inject(Function(readShroeppelWithPrefix.toString()));

                const ip = inject((<any>type).invPrecision);
                const p = inject((<any>type).precision);

                const pfx = methods.patch.def(0);
                methods.patch.append(`if(tr&${1 << (i & 7)}){${pfx}=s.readUint8();`);

                const dx = methods.patch.def(0);
                const dy = methods.patch.def(0);
                let dz;
                let dw;
                (length > 2) && (dz = methods.patch.def(0));
                (length > 3) && (dw = methods.patch.def(0));

                methods.patch.append(`if(${pfx}&${1 << numPackedBits}){${dx}=${rswp}(${pfx},s);(${pfx}&${1 << (numPackedBits + 1)})&&(${dy}=${rs}(s));`);
                (length > 2) && methods.patch.append(`(${pfx}&${1 << (numPackedBits + 2)})&&(${dz}=${rs}(s));`);
                (length > 3) && methods.patch.append(`(${pfx}&${1 << (numPackedBits + 3)})&&(${dw}=${rs}(s));`);
                (length > 2) && methods.patch.append(`}else if(${pfx}&${1 << (numPackedBits + 1)}){${dy}=${rswp}(${pfx},s);(${pfx}&${1 << (numPackedBits + 2)})&&(${dz}=${rs}(s));`);
                (length > 3) && methods.patch.append(`(${pfx}&${1 << (numPackedBits + 3)})&&(${dw}=${rs}(s));}else if(${pfx}&${1 << (numPackedBits + 2)}){${dz}=${rswp}(${pfx},s);(${pfx}&${1 << (numPackedBits + 3)})&&(${dw}=${rs}(s));`);
                methods.patch.append(`}else{${length === 2 ? dy : length === 3 ? dz : dw}=${rswp}(${pfx},s)}`);

                const qv = methods.patch.def(null);
                methods.patch.append(
                    `${qv}=${typeRefs[i]}.alloc();`,
                    `${qv}[0]=${p}*(((${ip}*b[${pr}][0])>>0)+${dx});`,
                    `${qv}[1]=${p}*(((${ip}*b[${pr}][1])>>0)+${dy});`,
                );
                (length > 2) && methods.patch.append(`${qv}[2]=${p}*(((${ip}*b[${pr}][2])>>0)+${dz});`);
                (length > 3) && methods.patch.append(`${qv}[3]=${p}*(((${ip}*b[${pr}][3])>>0)+${dw});`);
                methods.patch.append(`t[${pr}]=${qv};`);
                methods.patch.append(`}else{t[${pr}]=${typeRefs[i]}.clone(b[${pr}])}`);
            } else {
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
