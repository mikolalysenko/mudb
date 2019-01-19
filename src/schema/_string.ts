import { MuWriteStream, MuReadStream } from '../stream';
import { MuSchema } from './schema';
import { MuStringType } from './type';

/** Internal string type schema */
export abstract class MuString implements MuSchema<string> {
    public readonly identity:string;
    public readonly muType:string;
    public readonly json:object;

    constructor (identity:string, type:MuStringType) {
        this.identity = identity;
        this.muType = type;
        this.json = {
            type,
            identity,
        };
    }

    public alloc () : string {
        return this.identity;
    }

    public free (str:string) : void { }

    public equal (a:string, b:string) : boolean {
        return a === b;
    }

    public clone (str:string) : string {
        return str;
    }

    public assign (dst:string, src:string) : void { }

    public toJSON (str:string) : string {
        return str;
    }

    public fromJSON (json:string) : string {
        return json;
    }

    public abstract diff (base:string, target:string, out:MuWriteStream) : boolean;
    public abstract patch (base:string, inp:MuReadStream) : string;
}
