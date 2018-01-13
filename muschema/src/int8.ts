import { MuNumber, MuNumberType } from './_number';
import { MuWriteStream, MuReadStream } from 'mustreams';

export class MuInt8 extends MuNumber {
    public readonly muType:MuNumberType = 'int8';

    constructor(value?:number) {
        super((value || 0) << 24 >> 24);
    }

    public diffBinary (base:number, target:number, stream:MuWriteStream) {
        if (base !== target) {
            stream.grow(1);
            stream.writeInt8(target);
            return true;
        }
        return false;
    }

    public patchBinary (base:number, stream:MuReadStream) {
        return stream.readInt8();
    }

    public calcByteLength (x:MuInt8) {
        return 1;
    }
}
