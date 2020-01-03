import { MuWriteStream, MuReadStream } from '../stream';
import { MuNumber } from './_number';

export class MuFloat64 extends MuNumber<'float64'> {
    constructor(identity?:number) {
        super(identity, 'float64');
    }

    public diff (base:number, target:number, out:MuWriteStream) : boolean {
        if (base !== target) {
            out.grow(8);
            out.writeFloat64(target);
            return true;
        }
        return false;
    }

    public patch (base:number, inp:MuReadStream) : number {
        return inp.readFloat64();
    }
}
