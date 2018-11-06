import { MuNumber, MuNumberType } from './_number';
import { MuWriteStream, MuReadStream } from '../stream';

export class MuInt16 extends MuNumber {
    constructor(value?:number) {
        super((value || 0) << 16 >> 16, 'int16');
    }

    public diff (base:number, target:number, stream:MuWriteStream) {
        if ((base << 16 >> 16) !== (target << 16 >> 16)) {
            stream.grow(2);
            stream.writeInt16(target);
            return true;
        }
        return false;
    }

    public patch (base:number, stream:MuReadStream) {
        return stream.readInt16();
    }
}
