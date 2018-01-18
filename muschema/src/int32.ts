import { MuNumber, MuNumberType } from './_number';
import { MuWriteStream, MuReadStream } from 'mustreams';

export class MuInt32 extends MuNumber {
    public readonly muType:MuNumberType = 'int32';

    constructor(value?:number) {
        super((value || 0) << 0);
    }

    public diff (base:number, target:number, stream:MuWriteStream) {
        if (base !== target) {
            stream.grow(4);
            stream.writeInt32(target);
            return true;
        }
        return false;
    }

    public patch (base:number, stream:MuReadStream) {
        return stream.readInt32();
    }

    public calcByteLength (x:MuInt32) {
        return 4;
    }
}
