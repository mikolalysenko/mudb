import { MuSchema } from './schema';
import { MuWriteStream, MuReadStream } from '../stream';

export class MuASCII implements MuSchema<string> {
    public readonly identity:string;
    public readonly muType = 'ascii';
    public readonly json:object;

    constructor (identity?:string) {
        this.identity = identity || '';
        this.json = {
            type: 'ascii',
            identity: this.identity,
        };
    }

    public alloc () : string {
        return this.identity;
    }

    public free (str:string) : void { }

    public equal (a:string, b:string) {
        return a === b;
    }

    public clone (str:string) {
        return str;
    }

    public copy (source:string, target:string) { }

    public diff (base:string, target:string, out:MuWriteStream) : boolean {
        if (base !== target) {
            out.grow(4 + target.length);
            out.writeASCII(target);
            return true;
        }
        return false;
    }

    public patch (base:string, inp:MuReadStream) : string {
        return inp.readASCII();
    }

    public toJSON (str:string) : string {
        return str;
    }

    public fromJSON (json:string) : string {
        return json;
    }
}
