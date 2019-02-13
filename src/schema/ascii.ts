import { MuWriteStream, MuReadStream } from '../stream';
import { MuString } from './_string';

export class MuASCII extends MuString<'ascii'> {
    constructor (identity?:string) {
        super(identity || '', 'ascii');
    }

    public diff (base:string, target:string, out:MuWriteStream) : boolean {
        if (base !== target) {
            out.grow(5 + target.length);
            out.writeVarint(target.length);
            out.writeASCII(target);
            return true;
        }
        return false;
    }

    public patch (base:string, inp:MuReadStream) : string {
        return inp.readASCII(inp.readVarint());
    }
}
