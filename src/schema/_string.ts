import { MuWriteStream, MuReadStream } from '../stream';
import { MuSchema } from './schema';
import { MuStringType } from './type';

export abstract class MuString<T extends MuStringType> implements MuSchema<string> {
    public readonly muType:T;
    public readonly identity:string;
    public readonly json:object;

    constructor (identity:string, type:T) {
        this.identity = identity;
        this.muType = type;
        this.json = {
            type,
            identity,
        };
    }

    public alloc () : string { return this.identity; }

    public free (str:string) : void { }

    public equal (a:string, b:string) : boolean { return a === b; }

    public clone (str:string) : string { return str; }

    public assign (dst:string, src:string) : string { return src; }

    public toJSON (str:string) : string { return str; }

    public fromJSON (x:string) : string {
        if (typeof x === 'string') {
            return x;
        }
        return String(x);
    }

    public abstract diff (base:string, target:string, out:MuWriteStream) : boolean;

    public abstract patch (base:string, inp:MuReadStream) : string;
}
