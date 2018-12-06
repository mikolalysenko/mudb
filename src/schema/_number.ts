import { MuWriteStream, MuReadStream } from '../stream';
import { MuSchema } from './schema';
import { inRange } from './util/numeric';

export type MuNumberType =
    'float32' |
    'float64' |
    'int8'    |
    'int16'   |
    'int32'   |
    'uint8'   |
    'uint16'  |
    'uint32';

/** Number type schema */
export abstract class MuNumber implements MuSchema<number> {
    public readonly identity:number;
    public readonly muType:MuNumberType;
    public readonly json:object;

    constructor (identity:number, type:MuNumberType) {
        if (!inRange(identity, type)) {
            throw new RangeError(`cannot set ${identity} as identity of ${type}`);
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
