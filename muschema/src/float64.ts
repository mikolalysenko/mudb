import { MuNumber, MuNumberType } from './_number';
import { MuWriteStream, MuReadStream } from 'mustreams';

export class MuFloat64 extends MuNumber {
    public readonly muType:MuNumberType = 'float64';

    constructor(value?:number) {
        super(+(value || 0));
    }

    public diffBinary (base:number, target:number, stream:MuWriteStream) {
        if (base !== target) {
            stream.grow(8);
            stream.writeFloat64(target);
            return true;
        }
        return false;
    }

    public patchBinary (base:number, stream:MuReadStream) {
        if (stream.bytesLeft() > 7) {
            return stream.readFloat64();
        }
        return base;
    }

    public calcByteLength (x:MuFloat64) {
        return 8;
    }
}
