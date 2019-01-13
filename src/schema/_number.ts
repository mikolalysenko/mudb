import { MuWriteStream, MuReadStream } from '../stream';
import { MuSchema } from './schema';
import { MuNumericType } from './type';
import { range } from './constant/range';

/** Number type schema */
export abstract class MuNumber<T extends MuNumericType> implements MuSchema<number> {
    public readonly identity:number;
    public readonly muType:T;
    public readonly json:object;

    constructor (identity:number, type:T) {
        const r = range[type];
        if (!(identity >= r[0] && identity <= r[1])) {
            throw new RangeError(`${identity} is out of range of ${type}`);
        }

        this.identity = identity;
        this.muType = type;
        this.json = {
            type: this.muType,
            identity: this.identity,
        };
    }

    public alloc () {
        return this.identity;
    }

    public free (num:number) : void { }

    public equal (a:number, b:number) {
        return a === b;
    }

    public clone (num:number) {
        return num;
    }

    public assign (dst:number, src:number) { }

    public toJSON (num:number) : number {
        return num;
    }

    public fromJSON (json:number) : number {
        return json;
    }

    public abstract diff (base:number, target:number, out:MuWriteStream) : boolean;
    public abstract patch (base:number, inp:MuReadStream) : number;
}
