import { MuWriteStream, MuReadStream } from '../stream';
import { MuNumber } from './_number';

export class MuInt16 extends MuNumber<'int16'> {
    constructor(identity?:number) {
        super(identity || 0, 'int16');
    }

    public diff (base:number, target:number, out:MuWriteStream) {
        if ((base << 16 >> 16) !== (target << 16 >> 16)) {
            out.grow(2);
            out.writeInt16(target);
            return true;
        }
        return false;
    }

    public patch (base:number, inp:MuReadStream) {
        return inp.readInt16();
    }
}
