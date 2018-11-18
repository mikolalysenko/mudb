import { MuWriteStream, MuReadStream } from '../stream';
import { MuNumber } from './_number';

export class MuUint16 extends MuNumber {
    constructor(identity?:number) {
        super((identity || 0) & 0xFFFF, 'uint16');
    }

    public diff (base:number, target:number, out:MuWriteStream) {
        if ((base & 0xffff) !== (target & 0xffff)) {
            out.grow(2);
            out.writeUint16(target);
            return true;
        }
        return false;
    }

    public patch (base:number, inp:MuReadStream) {
        return inp.readUint16();
    }
}
