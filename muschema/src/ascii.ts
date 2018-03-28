import { MuSchema } from './schema';
import { MuWriteStream, MuReadStream } from 'mustreams';

export class MuASCIIString implements MuSchema<string> {
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
    public free () {}
    public clone (x:string) : string { return x; }

    public diff (base:string, target:string, out:MuWriteStream) : boolean {
        if (base !== target) {
            out.grow(4 + target.length);
            out.writeUint32(target.length);
            out.writeASCII(target);
            return true;
        }
        return false;
    }

    public patch (base:string, inp:MuReadStream) : string {
        return inp.readASCII();
    }
}
