import { MuSchema } from '.';
import { MuNumber } from './_number';
import { MuWriteStream, MuReadStream } from '../stream';

const typeToCtor = {
    float32: Float32Array,
    float64: Float64Array,
    int8: Int8Array,
    int16: Int16Array,
    int32: Int32Array,
    uint8: Uint8Array,
    uint16: Uint16Array,
    uint32: Uint32Array,
};

const typeToCtorName = {
    float32: 'Float32Array',
    float64: 'Float64Array',
    int8: 'Int8Array',
    int16: 'Int16Array',
    int32: 'Int32Array',
    uint8: 'Uint8Array',
    uint16: 'Uint16Array',
    uint32: 'Uint32Array',
};

type MuVectorNumericType = keyof typeof typeToCtor;

export interface MuFloat32Array<D extends number> extends Float32Array {
    readonly length:D;
}
export interface MuFloat64Array<D extends number> extends Float64Array {
    readonly length:D;
}
export interface MuInt8Array<D extends number> extends Int8Array {
    readonly length:D;
}
export interface MuInt16Array<D extends number> extends Int16Array {
    readonly length:D;
}
export interface MuInt32Array<D extends number> extends Int32Array {
    readonly length:D;
}
export interface MuUint8Array<D extends number> extends Uint8Array {
    readonly length:D;
}
export interface MuUint16Array<D extends number> extends Uint16Array {
    readonly length:D;
}
export interface MuUint32Array<D extends number> extends Uint32Array {
    readonly length:D;
}

type Vector<T extends MuVectorNumericType, D extends number> = {
    float32:MuFloat32Array<D>;
    float64:MuFloat64Array<D>;
    int8:MuInt8Array<D>;
    int16:MuInt16Array<D>;
    int32:MuInt32Array<D>;
    uint8:MuUint8Array<D>;
    uint16:MuUint16Array<D>;
    uint32:MuUint32Array<D>;
}[MuNumber<T>['muType']];

type FixedLengthNumericArray<L extends number> = L extends 0
    ? never[]
    : {
        0:number,
        length:L;
    } & ReadonlyArray<number>;

export class MuVector<T extends MuVectorNumericType, D extends number> implements MuSchema<Vector<T, D>> {
    public readonly muType = 'vector';
    public readonly muData:MuNumber<T>;
    public readonly identity:Vector<T, D>;
    public readonly json:object;
    public readonly dimension:D;

    public readonly alloc:() => Vector<T, D>;
    public readonly free:() => void;
    public readonly equal:(a:Vector<T, D>, b:Vector<T, D>) => boolean;
    public readonly assign:(dst:Vector<T, D>, src:Vector<T, D>) => Vector<T, D>;
    public readonly clone:(vec:Vector<T, D>) => Vector<T, D>;
    public readonly diff:(base:Vector<T, D>, target:Vector<T, D>, out:MuWriteStream) => boolean;
    public readonly patch:(base:Vector<T, D>, inp:MuReadStream) => Vector<T, D>;
    public readonly toJSON:(vec:Vector<T, D>) => FixedLengthNumericArray<D>;
    public readonly fromJSON:(arr:FixedLengthNumericArray<D>) => Vector<T, D>;

    constructor (schema:MuNumber<T>, dimension:D) {
        this.muData = schema;
        this.identity = <any>new (typeToCtor[schema.muType])(dimension);
        this.json = {
            type: 'vector',
            valueType: schema.json,
            dimension,
        };
        this.dimension = dimension;

        function block () {
            const body:string[] = [];
            return {
                append: function (...code:string[]) {
                    body.push.apply(body, code);
                },
                toString: function () {
                    return body.join('');
                },
            };
        }

        function func (name:string, params:string[]) {
            const b = block();
            const baseToString = b.toString;
            b.toString = function () {
                return `function ${name}(${params.join()}){${baseToString()}}`;
            };
            return b;
        }

        const prolog = block();
        prolog.append(`var pool=[];`);

        const methods = {
            alloc: func('alloc', []),
            free: func('free', ['v']),
            equal: func('equal', ['a', 'b']),
            assign: func('assign', ['d', 's']),
            clone: func('clone', ['v']),
            diff: func('diff', ['b', 't', 'o']),
            patch: func('patch', ['b', 'i']),
            toJSON: func('toJSON', ['v']),
            fromJSON: func('fromJSON', ['a']),
        };

        // alloc
        methods.alloc.append(`return pool.pop()||new ${typeToCtorName[schema.muType]}(${dimension});`);

        // free
        methods.free.append(`pool.push(v);`);

        // equal
        methods.equal.append(`if(a.length!==b.length){return false}`);
        methods.equal.append(`if(!(a instanceof ${typeToCtorName[schema.muType]})||!(b instanceof ${typeToCtorName[schema.muType]})){return false}`);
        for (let i = dimension - 1; i >= 0; --i) {
            methods.equal.append(`if(a[${i}]!==b[${i}]){return false}`);
        }
        methods.equal.append(`return true;`);

        // assign
        methods.assign.append(`d.set(s);return d;`);

        // clone
        methods.clone.append(`var copy=alloc();`);
        for (let i = 0; i < dimension; ++i) {
            methods.clone.append(`copy[${i}]=v[${i}];`);
        }
        methods.clone.append(`return copy;`);

        // diff
        const numMaskBits = this.identity.byteLength;
        methods.diff.append(
            `var bv=new Uint8Array(b.buffer);var tv=new Uint8Array(t.buffer);`,
            `o.grow(${Math.ceil(numMaskBits * 9 / 8)});`, // mask+data bytes
            `var head=o.offset;var m=0;var mos=head;var nd=0;`,
            `o.offset+=${Math.ceil(numMaskBits / 8)};`,
        );
        for (let i = 0; i < numMaskBits; ++i) {
            methods.diff.append(`if(bv[${i}]!==tv[${i}]){++nd;m|=${1 << (i & 7)};o.writeUint8(tv[${i}])}`);
            if ((i & 7) === 7) {
                methods.diff.append(`o.writeUint8At(mos++,m);m=0;`);
            }
        }
        methods.diff.append(`if(nd===0){o.offset=head;return false}`);
        if (numMaskBits & 7) {
            methods.diff.append(`o.writeUint8At(mos,m);`);
        }
        methods.diff.append(`return true;`);

        // patch
        const numMaskFullBytes = numMaskBits / 8 | 0;
        const numMaskBytes = Math.ceil(numMaskBits / 8);
        methods.patch.append(
            `var head=i.offset;i.offset+=${numMaskBytes};`,
            `var t=clone(b);var tv=new Uint8Array(t.buffer);`,
            `var m;`,
        );
        for (let i = 0; i < numMaskFullBytes; ++i) {
            const start = i * 8;
            methods.patch.append(`m=i.readUint8At(head+${i});`);
            for (let j = 0; j < 8; ++j) {
                methods.patch.append(`if(m&${1 << j}){tv[${start + j}]=i.readUint8();}`);
            }
        }
        const numPartialBits = numMaskBits & 7;
        if (numPartialBits) {
            const start = numMaskFullBytes * 8;
            methods.patch.append(`m=i.readUint8At(head+${numMaskFullBytes});`);
            for (let i = 0; i < numPartialBits; ++i) {
                methods.patch.append(`if(m&${1 << i}){tv[${start + i}]=i.readUint8()}`);
            }
        }
        methods.patch.append(`return t;`);

        // toJSON
        methods.toJSON.append(`var a=new Array(${dimension});`);
        for (let i = 0; i < dimension; ++i) {
            methods.toJSON.append(`a[${i}]=v[${i}];`);
        }
        methods.toJSON.append(`return a;`);

        // fromJSON
        methods.fromJSON.append(`var v=alloc();`);
        for (let i = 0; i < dimension; ++i) {
            methods.fromJSON.append(`v[${i}]=schema.fromJSON(a[${i}]);`);
        }
        methods.fromJSON.append(`return v;`);

        const epilog = block();
        epilog.append(`return {`);
        Object.keys(methods).forEach((m) => {
            prolog.append(methods[m].toString());
            epilog.append(`${m}:${m},`);
        });
        epilog.append(`};`);
        prolog.append(epilog.toString());

        const proc = new Function('schema', prolog.toString());
        const compiled = proc(schema);
        this.alloc = compiled.alloc;
        this.free = compiled.free;
        this.equal = compiled.equal;
        this.assign = compiled.assign;
        this.clone = compiled.clone;
        this.diff = compiled.diff;
        this.patch = compiled.patch;
        this.toJSON = compiled.toJSON;
        this.fromJSON = compiled.fromJSON;
    }
}
