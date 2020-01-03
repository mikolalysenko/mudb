import { MuWriteStream, MuReadStream } from '../stream';
import { MuSchema } from './schema';

function tuple<T extends any[]> (...args:T) : T {
    return args;
}

export const ranges = {
    float32:    tuple(-3.4028234663852886e+38, 3.4028234663852886e+38),
    float64:    tuple(-1.7976931348623157e+308, 1.7976931348623157e+308),

    int8:       tuple(-0x80,        0x7f),
    int16:      tuple(-0x8000,      0x7fff),
    int32:      tuple(-0x80000000,  0x7fffffff),

    uint8:      tuple(0, 0xff),
    uint16:     tuple(0, 0xffff),
    uint32:     tuple(0, 0xffffffff),

    varint:     tuple(0, 0xffffffff),
    rvarint:    tuple(0, 0xffffffff),
};

export type MuNumericType =
    'float32'   |
    'float64'   |
    'int8'      |
    'int16'     |
    'int32'     |
    'uint8'     |
    'uint16'    |
    'uint32'    |
    'varint'    |
    'rvarint';

export abstract class MuNumber<T extends MuNumericType> implements MuSchema<number> {
    public readonly muType:T;
    public readonly identity:number;
    public readonly json:object;

    constructor (identity_:number|undefined, type:T) {
        const identity = identity_ === identity_ ? identity_ || 0 : NaN;
        const range = ranges[type];

        if (identity !== Infinity && identity !== -Infinity && identity === identity) {
            if (identity < range[0] || identity > range[1]) {
                throw new RangeError(`${identity} is out of range of ${type}`);
            }
        } else if (type !== 'float32' && type !== 'float64') {
            throw new RangeError(`${identity} is out of range of ${type}`);
        }

        this.identity = identity;
        this.muType = type;
        this.json = {
            type,
            identity,
        };
    }

    public alloc () : number { return this.identity; }

    public free (num:number) : void { }

    public equal (a:number, b:number) : boolean { return a === b; }

    public clone (num:number) : number { return num; }

    public assign (dst:number, src:number) : number { return src; }

    public toJSON (num:number) : number { return num; }

    public fromJSON (x:number) : number {
        if (typeof x === 'number') {
            return x;
        }
        return this.identity;
    }

    public abstract diff (base:number, target:number, out:MuWriteStream) : boolean;

    public abstract patch (base:number, inp:MuReadStream) : number;
}
