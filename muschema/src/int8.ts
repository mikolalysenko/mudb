import { MuNumber, MuNumberType } from './_number';
import { MuWriteStream, MuReadStream } from 'mustreams';

export class MuInt8 extends MuNumber {
    constructor(value?:number) {
        super((value || 0) << 24 >> 24, 'int8');
    }

    public diff (base:number, target:number, stream:MuWriteStream) {
        if (base !== target) {
            stream.grow(1);
            stream.writeInt8(target);
            return true;
        }
        return false;
    }

    public patch (base:number, stream:MuReadStream) {
        return stream.readInt8();
    }
}
