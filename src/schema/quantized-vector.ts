import { vec2, vec3, vec4 } from 'gl-matrix';
import { MuWriteStream, MuReadStream } from '../stream';
import makeError = require('../util/error');

import { MuSchema } from './schema';
import { MuVector } from './vector';
import { MuFloat32 } from './float32';

const error = makeError('schema/quantized-vec');

const Vec2Schema:MuSchema<vec2> = <any>new MuVector(new MuFloat32(), 2);
const Vec3Schema:MuSchema<vec3> = <any>new MuVector(new MuFloat32(), 3);
const Vec4Schema:MuSchema<vec4> = <any>new MuVector(new MuFloat32(), 4);

type Dimension = 2 | 3 | 4;

type Vec<D extends Dimension> =
    D extends 2 ? vec2 :
    D extends 3 ? vec3 :
    D extends 4 ? vec4 : never;

type Tuple<D extends Dimension> =
    D extends 2 ? [number, number] :
    D extends 3 ? [number, number, number] :
    D extends 4 ? [number, number, number, number] : never;

type Schema<D extends Dimension> =
    D extends 2 ? typeof Vec2Schema :
    D extends 3 ? typeof Vec3Schema :
    D extends 4 ? typeof Vec4Schema : never;

export class MuQuantizedVector<D extends Dimension> implements MuSchema<Vec<D>> {
    public readonly muType:string;
    public readonly identity:Vec<D>;
    public readonly muData:{
        type:string;
        precision:number;
        identity:Tuple<D>;
    };
    public readonly json:{
        type:string;
        precision:number;
        identity:Tuple<D>;
    };

    public readonly dimension:D;
    public precision:number;
    public invPrecision:number;

    public readonly alloc:() => Vec<D>;
    public readonly free:(vec:Vec<D>) => void;
    public readonly equal:(a:Vec<D>, b:Vec<D>) => boolean;
    public readonly assign:(dst:Vec<D>, src:Vec<D>) => Vec<D>;
    public readonly clone:(vec:Vec<D>) => Vec<D>;
    public readonly toJSON:(vec:Vec<D>) => Tuple<D>;
    public readonly fromJSON:(tup:Tuple<D>) => Vec<D>;
    public readonly diff:(base:Vec<D>, target:Vec<D>, stream:MuWriteStream) => boolean;
    public readonly patch:(base:Vec<D>, stream:MuReadStream) => Vec<D>;

    constructor (
        dimension:D,
        precision:number,
        identity?:Vec<D>,
    ) {
        if (dimension !== 2 && dimension !== 3 && dimension !== 4) {
            throw error(`dimension must be 2, 3, or 4`);
        }

        function vecSchema (d:D) : Schema<D> {
            switch (d) {
                case 2:
                    return <any>Vec2Schema;
                case 3:
                    return <any>Vec3Schema;
                case 4:
                default:
                    return <any>Vec4Schema;
            }
        }

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

        this.muType = `quantized-vec${dimension}`;

        this.dimension = dimension;
        const p = this.precision = precision;
        const ip = this.invPrecision = 1 / this.precision;
        const schema = vecSchema(dimension);

        // identity
        this.identity = <Vec<D>>schema.alloc();
        if (identity) {
            for (let i = 0; i < dimension; ++i) {
                this.identity[i] = this.precision * (Math.round(this.invPrecision * identity[i]) >> 0);
            }
        }

        // muData
        const zeros = <Tuple<D>>new Array(dimension);
        for (let i = 0; i < dimension; ++i) {
            zeros[i] = 0;
        }
        this.muData = {
            type: this.muType,
            precision: this.precision,
            identity: zeros,
        };

        // json
        const identity_ = <Tuple<D>>new Array(dimension);
        for (let i = 0; i < dimension; ++i) {
            identity_[i] = this.identity[i];
        }
        this.json = {
            type: this.muType,
            precision: this.precision,
            identity: identity_,
        };

        const SCHROEPPEL2 = 0xAAAAAAAA;

        const prolog = block();
        prolog.append(`function dcs(x){return ((x^${SCHROEPPEL2})-${SCHROEPPEL2})>>0}`);

        const numPrefixBits = dimension + 1;
        const numPackedBits = 8 - numPrefixBits;

        const writeVarintWithPrefix = func('wvwp', ['pp', 'x', 's']);
        writeVarintWithPrefix.append(
            `var x0=x&${(1 << numPackedBits) - 1};`,
            `var x1=x>>>${numPackedBits};`,
            `var p=(x1?${1 << dimension}:0)|pp;`,
            `s.writeUint8((p<<${numPackedBits})|x0);`,
            `if(x1){s.writeVarint(x1)}`,
        );
        prolog.append(writeVarintWithPrefix.toString());

        const readSchroeppelWithPrefix = func('rswp', ['p', 's']);
        readSchroeppelWithPrefix.append(
            `var x = p&${(1 << numPackedBits) - 1};`,
            `if(p&128){x+=s.readVarint()<<${numPackedBits};}`,
            `return ((x^${SCHROEPPEL2})-${SCHROEPPEL2})>>0;`,
        );
        prolog.append(readSchroeppelWithPrefix.toString());

        const methods = {
            alloc: func('alloc', []),
            free: func('free', ['v']),
            equal: func('equal', ['a', 'b']),
            assign: func('assign', ['d', 's']),
            clone: func('clone', ['v']),
            toJSON: func('toJSON', ['v']),
            fromJSON: func('fromJSON', ['a']),
            diff: func('diff', ['b', 't', 'o']),
            patch: func('patch', ['b', 'i']),
        };

        // alloc
        methods.alloc.append(`return schema.alloc();`);

        // free
        methods.free.append(`schema.free(v);`);

        // equal
        methods.equal.append(`return (Math.round(${ip}*a[0])>>0)===(Math.round(${ip}*b[0])>>0)`);
        for (let i = 1; i < dimension; ++i) {
            methods.equal.append(`&&(Math.round(${ip}*a[${i}])>>0)===(Math.round(${ip}*b[${i}])>>0)`);
        }

        // assign
        for (let i = 0; i < dimension; ++i) {
            methods.assign.append(`d[${i}]=(Math.round(${ip}*s[${i}])>>0)*${p};`);
        }
        methods.assign.append(`return d;`);

        // clone
        methods.clone.append(`var cp=schema.alloc();return assign(cp,v);`);

        // toJSON
        methods.toJSON.append(`return [`);
        for (let i = 0; i < dimension; ++i) {
            methods.toJSON.append(`${p}*(Math.round(${ip}*v[${i}])>>0),`);
        }
        methods.toJSON.append(`];`);

        // fromJSON
        methods.fromJSON.append(`if(Array.isArray(a)&&a.length===${dimension}`);
        for (let i = 0; i < dimension; ++i) {
            methods.fromJSON.append(`&&typeof a[${i}]==='number'`);
        }
        methods.fromJSON.append(`){return clone(a)}return schema.clone(identity)`);

        /** diff */
        methods.diff.append(
            `var bx=Math.round(${ip}*b[0])>>0;var tx=Math.round(${ip}*t[0])>>0;`,
            `var by=Math.round(${ip}*b[1])>>0;var ty=Math.round(${ip}*t[1])>>0;`,
        );
        (dimension > 2) && methods.diff.append(`var bz=Math.round(${ip}*b[2])>>0;var tz=Math.round(${ip}*t[2])>>0;`);
        (dimension > 3) && methods.diff.append(`var bw=Math.round(${ip}*b[3])>>0;var tw=Math.round(${ip}*t[3])>>0;`);

        methods.diff.append(`if(bx===tx&&by===ty`);
        (dimension > 2) && methods.diff.append(`&&bz===tz`);
        (dimension > 3) && methods.diff.append(`&&bw===tw`);
        methods.diff.append(`){return false}`);

        // encode delta
        methods.diff.append(`var dx=(${SCHROEPPEL2}+(tx-bx)^${SCHROEPPEL2})>>>0;var dy=(${SCHROEPPEL2}+(ty-by)^${SCHROEPPEL2})>>>0;`);
        (dimension > 2) && methods.diff.append(`var dz=(${SCHROEPPEL2}+(tz-bz)^${SCHROEPPEL2})>>>0;`);
        (dimension > 3) && methods.diff.append(`var dw=(${SCHROEPPEL2}+(tw-bw)^${SCHROEPPEL2})>>>0;`);

        // partial prefix
        methods.diff.append(`var pp=(dx?1:0)|(dy?2:0)`);
        (dimension > 2) && methods.diff.append(`|(dz?4:0)`);
        (dimension > 3) && methods.diff.append(`|(dw?8:0)`);

        // write to stream
        methods.diff.append(`;o.grow(21);`);
        methods.diff.append(`if(dx){wvwp(pp,dx,o);dy&&o.writeVarint(dy);`);
        (dimension > 2) && methods.diff.append(`dz&&o.writeVarint(dz);`);
        (dimension > 3) && methods.diff.append(`dw&&o.writeVarint(dw);`);
        (dimension === 3) && methods.diff.append(`}else if(dy){wvwp(pp,dy,o);dz&&o.writeVarint(dz)`);
        (dimension === 4) && methods.diff.append(
            `}else if(dy){wvwp(pp,dy,o);dz&&o.writeVarint(dz);dw&&o.writeVarint(dw)`,
            `}else if(dz){wvwp(pp,dz,o);dw&&o.writeVarint(dw)`,
        );
        methods.diff.append(`}else{wvwp(pp,${dimension === 2 ? 'dy' : dimension === 3 ? 'dz' : 'dw'},o)}`);
        methods.diff.append(`return true;`);

        /** patch */
        methods.patch.append(`var pfx=i.readUint8();var dx=0;var dy=0;`);
        (dimension > 2) && methods.patch.append(`var dz=0;`);
        (dimension > 3) && methods.patch.append(`var dw=0;`);
        methods.patch.append(
            `if(pfx&${1 << numPackedBits}){dx=rswp(pfx,i);`,
            `(pfx&${1 << (numPackedBits + 1)})&&(dy=((i.readVarint()^${SCHROEPPEL2})-${SCHROEPPEL2})>>0);`,
        );
        (dimension > 2) && methods.patch.append(`(pfx&${1 << (numPackedBits + 2)})&&(dz=((i.readVarint()^${SCHROEPPEL2})-${SCHROEPPEL2})>>0);`);
        (dimension > 3) && methods.patch.append(`(pfx&${1 << (numPackedBits + 3)})&&(dw=((i.readVarint()^${SCHROEPPEL2})-${SCHROEPPEL2})>>0);`);
        (dimension === 3) && methods.patch.append(
            `}else if(pfx&32){dy=rswp(pfx,i);`,
            `(pfx&64)&&(dz=((i.readVarint()^${SCHROEPPEL2})-${SCHROEPPEL2})>>0)`);
        (dimension === 4) && methods.patch.append(
            `}else if(pfx&16){dy=rswp(pfx,i);`,
            `(pfx&32)&&(dz=((i.readVarint()^${SCHROEPPEL2})-${SCHROEPPEL2})>>0);`,
            `(pfx&64)&&(dw=((i.readVarint()^${SCHROEPPEL2})-${SCHROEPPEL2})>>0)`,
            `}else if(pfx&32){dz=rswp(pfx,i);`,
            `(pfx&64)&&(dw=((i.readVarint()^${SCHROEPPEL2})-${SCHROEPPEL2})>>0)`,
        );
        methods.patch.append(`}else{${dimension === 2 ? 'dy' : dimension === 3 ? 'dz' : 'dw'}=rswp(pfx,i)}`);
        methods.patch.append(`var t=schema.alloc();var bx=Math.round(${ip}*b[0])>>0;var by=Math.round(${ip}*b[1])>>0;`);
        (dimension > 2) && methods.patch.append(`var bz=Math.round(${ip}*b[2])>>0;`);
        (dimension > 3) && methods.patch.append(`var bw=Math.round(${ip}*b[3])>>0;`);
        methods.patch.append(`t[0]=${p}*(bx+dx);t[1]=${p}*(by+dy);`);
        (dimension > 2) && methods.patch.append(`t[2]=${p}*(bz+dz);`);
        (dimension > 3) && methods.patch.append(`t[3]=${p}*(bw+dw);`);
        methods.patch.append(`return t;`);

        const epilog = block();
        epilog.append(`return {`);
        Object.keys(methods).forEach(function (name) {
            prolog.append(methods[name].toString());
            epilog.append(`${name}:${name},`);
        });
        epilog.append(`};`);
        prolog.append(epilog.toString());

        const proc = new Function('schema', 'identity', prolog.toString());
        const props = proc(schema, this.identity);

        this.alloc = props.alloc;
        this.free = props.free;
        this.equal = props.equal;
        this.assign = props.assign;
        this.clone = props.clone;
        this.toJSON = props.toJSON;
        this.fromJSON = props.fromJSON;
        this.diff = props.diff;
        this.patch = props.patch;
    }
}
