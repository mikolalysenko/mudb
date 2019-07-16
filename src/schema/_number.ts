import { pair } from '../type';
import { MuWriteStream, MuReadStream } from '../stream';
import { MuSchema } from './schema';

export const ranges = {
    float32:    pair(-3.4028234663852886e+38,   3.4028234663852886e+38),
    float64:    pair(-1.7976931348623157e+308,  1.7976931348623157e+308),
    int8:       pair(-128,          127),
    int16:      pair(-32768,        32767),
    int32:      pair(-2147483648,   2147483647),
    uint8:      pair(0,             255),
    uint16:     pair(0,             65535),
    uint32:     pair(0,             4294967295),
};

export type MuNumericType =
    'float32'   |
    'float64'   |
    'int8'      |
    'int16'     |
    'int32'     |
    'uint8'     |
    'uint16'    |
    'uint32';

export abstract class MuNumber<T extends MuNumericType> implements MuSchema<number> {
    public readonly muType:T;
    public readonly identity:number;
    public readonly json:object;

    constructor (identity:number, type:T) {
        const range = ranges[type];
        if (identity < range[0] || identity > range[1]) {
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
