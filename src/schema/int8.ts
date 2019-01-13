import { MuWriteStream, MuReadStream } from '../stream';
import { MuNumber } from './_number';

export class MuInt8 extends MuNumber<'int8'> {
    constructor(identity?:number) {
        super(identity || 0, 'int8');
    }

    public diff (base:number, target:number, out:MuWriteStream) {
        if ((base << 24 >> 24) !== (target << 24 >> 24)) {
            out.grow(1);
            out.writeInt8(target);
            return true;
        }
        return false;
    }

    public patch (base:number, inp:MuReadStream) {
        return inp.readInt8();
    }
}
