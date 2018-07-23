import { MuNumber, MuNumberType } from './_number';
import { MuWriteStream, MuReadStream } from 'mustreams';

export class MuUint8 extends MuNumber {
    constructor(value?:number) {
        super((value || 0) & 0xFF, 'uint8');
    }

    public diff (base:number, target:number, stream:MuWriteStream) {
        if ((base & 0xff) !== (target & 0xff)) {
            stream.grow(1);
            stream.writeUint8(target);
            return true;
        }
        return false;
    }

    public patch (base:number, stream:MuReadStream) {
        return stream.readUint8();
    }
}
