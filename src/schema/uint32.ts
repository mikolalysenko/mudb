import { MuWriteStream, MuReadStream } from '../stream';
import { MuNumber } from './_number';

export class MuUint32 extends MuNumber {
    constructor(identity?:number) {
        super(identity || 0, 'uint32');
    }

    public diff (base:number, target:number, out:MuWriteStream) {
        if ((base >>> 0) !== (target >>> 0)) {
            out.grow(4);
            out.writeUint32(target);
            return true;
        }
        return false;
    }

    public patch (base:number, inp:MuReadStream) {
        return inp.readUint32();
    }
}
