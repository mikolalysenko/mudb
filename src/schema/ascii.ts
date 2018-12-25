import { MuWriteStream, MuReadStream } from '../stream';
import { MuString } from './_string';

export class MuASCII extends MuString {
    constructor (identity?:string) {
        super(identity || '', 'ascii');
    }

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
