import { MuWriteStream, MuReadStream } from '../stream';
import { MuString } from './_string';

export class MuFixedASCII extends MuString {
    public readonly length:number;

    constructor (lengthOrIdentity:number|string) {
        super(
            typeof lengthOrIdentity === 'number' ?
                Array(lengthOrIdentity + 1).join(' ') :
                lengthOrIdentity,
            'fixed-ascii',
        );
        this.length = typeof lengthOrIdentity === 'number' ?
            lengthOrIdentity :
            this.identity.length;
    }

    public diff (base:string, target:string, out:MuWriteStream) : boolean {
        const length = this.length;
        if (base.length !== length) {
            throw new Error(`base '${base}' consists of ${base.length} code units instead of ${length}`);
        }
        if (target.length !== length) {
            throw new Error(`target '${target}' consists of ${target.length} code units instead of ${length}`);
        }

        if (base !== target) {
            out.grow(length);
            out.writeASCII(target);
            return true;
        }
        return false;
    }

    public patch (base:string, inp:MuReadStream) : string {
        return inp.readASCIIOf(this.length);
    }
}
