import { MuSchema } from './schema';
import { MuWriteStream, MuReadStream } from '../stream';

let identityStr = ' ';

export class MuFixedASCII implements MuSchema<string> {
    public readonly identity:string;
    public readonly muType = 'fixed-ascii';
    public readonly json:object;

    public readonly length:number;

    constructor (lengthOrIdentity:number|string) {
        if (typeof lengthOrIdentity === 'number') {
            if (lengthOrIdentity < 0) {
                throw new RangeError('length cannot be negative');
            }
            const length = lengthOrIdentity | 0;
            if (length > 1 << 27) {
                throw new RangeError('invalid length');
            }
            this.length = length;

            while (length > identityStr.length) {
                identityStr += identityStr;
            }
            this.identity = identityStr.substr(0, length);
        } else {
            this.identity = lengthOrIdentity;
            this.length = lengthOrIdentity.length;
        }

        this.json = {
            type: 'fixed-ascii',
            identity: this.identity,
        };
    }

    public alloc () : string { return this.identity; }
    public free (str:string) : void { }

    public equal (a:string, b:string) {
        return a === b;
    }

    public clone (str:string) { return str; }

    public copy (source:string, target:string) { }

    public diff (base:string, target:string, out:MuWriteStream) : boolean {
        const length = this.length;
        if (base.length !== length) {
            throw new Error('base of invalid length');
        }
        if (target.length !== length) {
            throw new Error('target of invalid length');
        }

        if (base !== target) {
            out.grow(length);
            out.writeASCIINoLength(target);
            return true;
        }
        return false;
    }

    public patch (base:string, inp:MuReadStream) : string {
        return inp.readASCIIOf(this.length);
    }

    public toJSON (str:string) : string { return str; }
    public fromJSON (json:string) : string { return json; }
}
