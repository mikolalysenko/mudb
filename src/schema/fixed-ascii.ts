import { MuWriteStream, MuReadStream } from '../stream';
import { MuString } from './_string';

export class MuFixedASCII extends MuString<'fixed-ascii'> {
    public readonly length:number;

    constructor (lengthOrIdentity:number|string) {
        const identity = typeof lengthOrIdentity === 'number' ?
            new Array(lengthOrIdentity + 1).join(' ') :
            lengthOrIdentity;

        super(identity, 'fixed-ascii');
        this.length = identity.length;
    }

    public diff (base:string, target:string, out:MuWriteStream) : boolean {
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
