import { MuSchema } from './schema';
import { MuWriteStream, MuReadStream } from 'mustreams';

let identityStr = ' ';

export class MuFixedASCIIString implements MuSchema<string> {
    public readonly identity:string;
    public readonly muType = 'fixed-ascii';
    public readonly json:object;

    public readonly length:number;

    constructor (length:number, id?:string) {
        length >>>= 0;
        if (length > 1 << 27) {
            throw new RangeError('invalid length');
        }
        if (id && id.length !== length) {
            throw new Error('string length does not match the length to be set');
        }
        this.length = length;

        if (!id) {
            if (length > identityStr.length) {
                while (length > identityStr.length) {
                    identityStr += identityStr;
                }
            }
            this.identity = identityStr.substr(0, length);
        } else {
            this.identity = id;
        }

        this.json = {
            type: 'fixed-ascii',
            identity: this.identity,
        };
    }

    public alloc () : string { return this.identity; }
    public free () : void {}
    public clone (x:string) : string { return x; }

    public calcByteLength (x:string) : number {
        return this.length;
    }

    public diff (base:string, target:string, out:MuWriteStream) : boolean {
        if (base.length !== this.length) {
            throw new Error('length of base string does not match the length set');
        }
        if (target.length !== this.length) {
            throw new Error('length of target string does not match the length set');
        }

        if (base !== target) {
            out.grow(this.length);
            out.writeASCII(target);
            return true;
        }
        return false;
    }

    public patch (base:string, inp:MuReadStream) : string {
        return inp.readASCII(this.length);
    }
}
