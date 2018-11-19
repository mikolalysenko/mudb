import { MuWriteStream, MuReadStream } from '../stream';
import { MuNumber } from './_number';

export class MuFloat64 extends MuNumber {
    constructor(identity?:number) {
        super(+(identity || 0), 'float64');
    }

    public diff (base:number, target:number, out:MuWriteStream) {
        if (base !== target) {
            out.grow(8);
            out.writeFloat64(target);
            return true;
        }
        return false;
    }

    public patch (base:number, inp:MuReadStream) {
        return inp.readFloat64();
    }
}
