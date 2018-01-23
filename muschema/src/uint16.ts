import { MuNumber, MuNumberType } from './_number';
import { MuWriteStream, MuReadStream } from 'mustreams';

export class MuUint16 extends MuNumber {
    constructor(value?:number) {
        super((value || 0) & 0xFFFF, 'uint16');
    }

    public diff (base:number, target:number, stream:MuWriteStream) {
        if (base !== target) {
            stream.grow(2);
            stream.writeUint16(target);
            return true;
        }
        return false;
    }

    public patch (base:number, stream:MuReadStream) {
        return stream.readUint16();
    }

    public calcByteLength (x:MuUint16) {
        return 2;
    }
}
