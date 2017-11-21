import { MuNumber, MuNumberType } from './_number';
import { MuWriteStream, MuReadStream } from 'mustreams';

export class MuFloat32 extends MuNumber {
    public readonly muType:MuNumberType = 'float32';

    constructor(value?:number) {
        super(+(value || 0));
    }

    public diffBinary (base:number, target:number, stream:MuWriteStream) {
        if (base !== target) {
            stream.grow(4);
            stream.writeFloat32(target);
            return true;
        }
        return false;
    }

    public patchBinary (base:number, stream:MuReadStream) {
        if (stream.bytesLeft() > 3) {
            return stream.readFloat32();
        }
        return base;
    }

    public getByteLength (x:MuFloat32) {
        return 4;
    }
}
