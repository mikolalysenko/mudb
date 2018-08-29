import { MuSchema } from './schema';
import { MuWriteStream, MuReadStream } from 'mustreams';

export class MuASCII implements MuSchema<string> {
    public readonly identity:string;
    public readonly muType = 'ascii';
    public readonly json:object;

    constructor (id?:string) {
        this.identity = id || '';
        this.json = {
            type: 'ascii',
            identity: this.identity,
        };
    }

    public alloc () : string { return this.identity; }
    public free (_:string) : void { }

    public equal (x:string, y:string) {
        return x === y;
    }

    public clone (x:string) { return x; }

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
}
