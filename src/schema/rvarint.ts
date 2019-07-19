import { MuNumber } from './_number';
import { MuWriteStream, MuReadStream } from '../stream';

export class MuRelativeVarint extends MuNumber<'rvarint'> {
    constructor (identity?:number) {
        super(identity || 0, 'rvarint');
    }

    public diff (base:number, target:number, out:MuWriteStream) : boolean {
        const d = target - base;
        if (d) {
            out.grow(5);
            out.writeVarint(d > 0 ? d * 2 : -d * 2 - 1);
            return true;
        }
        return false;
    }

    public patch (base:number, inp:MuReadStream) : number {
        const x = inp.readVarint();
        const d = x & 1 ? (x + 1) / -2 : x / 2;
        return base + d;
    }
}
