import { MuNumber } from './_number';
import { MuWriteStream, MuReadStream } from '../stream';

const SCHROEPPEL2 = 0xAAAAAAAA;

export class MuRelativeVarint extends MuNumber<'rvarint'> {
    constructor (identity?:number) {
        super(identity, 'rvarint');
    }

    public diff (base:number, target:number, out:MuWriteStream) : boolean {
        if (base !== target) {
            out.grow(5);
            out.writeVarint((SCHROEPPEL2 + (target - base)) ^ SCHROEPPEL2);
            return true;
        }
        return false;
    }

    public patch (base:number, inp:MuReadStream) : number {
        const delta = (SCHROEPPEL2 ^ inp.readVarint()) - SCHROEPPEL2 >> 0;
        return base + delta;
    }
}
