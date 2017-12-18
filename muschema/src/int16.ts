import { MuNumber, MuNumberType } from './_number';
import { MuWriteStream, MuReadStream } from 'mustreams';

export class MuInt16 extends MuNumber {
    public readonly muType:MuNumberType = 'int16';

    constructor(value?:number) {
        super((value || 0) << 16 >> 16);
    }

    public diffBinary (base:number, target:number, stream:MuWriteStream) {
        if (base !== target) {
            stream.grow(2);
            stream.writeInt16(target);
            return true;
        }
        return false;
    }

    public patchBinary (base:number, stream:MuReadStream) {
        if (stream.bytesLeft() > 1) {
            return stream.readInt16();
        }
        return base;
    }

    public calcByteLength (x:MuInt16) {
        return 2;
    }
}
