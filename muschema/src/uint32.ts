import { MuNumber, MuNumberType } from './_number';
import { MuWriteStream, MuReadStream } from 'mustreams';

export class MuUint32 extends MuNumber {
    public readonly muType:MuNumberType = 'uint32';

    constructor(value?:number) {
        super((value || 0) >>> 0);
    }

    public diff (base:number, target:number, stream:MuWriteStream) {
        if (base !== target) {
            stream.grow(4);
            stream.writeUint32(target);
            return true;
        }
        return false;
    }

    public patch (base:number, stream:MuReadStream) {
        return stream.readUint32();
    }

    public calcByteLength (x:MuUint32) {
        return 4;
    }
}
