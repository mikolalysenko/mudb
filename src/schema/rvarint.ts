import { MuNumber } from './_number';
import { MuWriteStream, MuReadStream } from '../stream';

const SCHROEPPEL2 = 0xAAAAAAAA;

export class MuRelativeVarint extends MuNumber<'rvarint'> {
    constructor (identity?:number) {
        super(identity || 0, 'rvarint');
    }

    public diff (base:number, target:number, out:MuWriteStream) : boolean {
        const d = target - base;
        if (d) {
            out.grow(5);
            out.writeVarint(SCHROEPPEL2 + d ^ SCHROEPPEL2);
            return true;
        }
        return false;
    }

    public patch (base:number, inp:MuReadStream) : number {
        const x = inp.readVarint();
        const d = (SCHROEPPEL2 ^ x) - SCHROEPPEL2 >> 0;
        return base + d >>> 0;
    }
}
