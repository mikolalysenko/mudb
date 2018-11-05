import { MuNumber, MuNumberType } from './_number';
import { MuWriteStream, MuReadStream } from 'mustreams';

export class MuUint16 extends MuNumber {
    constructor(value?:number) {
        super((value || 0) & 0xFFFF, 'uint16');
    }

    public diff (base:number, target:number, stream:MuWriteStream) {
        if ((base & 0xffff) !== (target & 0xffff)) {
            stream.grow(2);
            stream.writeUint16(target);
            return true;
        }
        return false;
    }

    public patch (base:number, stream:MuReadStream) {
        return stream.readUint16();
    }
}
