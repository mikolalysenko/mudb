import { MuNumber, MuNumberType } from './_number';
import { MuWriteStream, MuReadStream } from 'mustreams';

export class MuInt16 extends MuNumber {
    public readonly muType:MuNumberType = 'int16';

    constructor(value?:number) {
        super((value || 0) << 16 >> 16);
    }

    public diff (base:number, target:number, stream:MuWriteStream) {
        if (base !== target) {
            stream.grow(2);
            stream.writeInt16(target);
            return true;
        }
        return false;
    }

    public patch (base:number, stream:MuReadStream) {
        return stream.readInt16();
    }

    public calcByteLength (x:MuInt16) {
        return 2;
    }
}
