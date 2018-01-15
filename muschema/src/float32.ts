import { MuNumber, MuNumberType } from './_number';
import { MuWriteStream, MuReadStream } from 'mustreams';

export class MuFloat32 extends MuNumber {
    public readonly muType:MuNumberType = 'float32';

    constructor(value?:number) {
        super(+(value || 0));
    }

    public diff (base:number, target:number, stream:MuWriteStream) {
        if (base !== target) {
            stream.grow(4);
            stream.writeFloat32(target);
            return true;
        }
        return false;
    }

    public patch (base:number, stream:MuReadStream) {
        return stream.readFloat32();
    }

    public calcByteLength (x:MuFloat32) {
        return 4;
    }
}
