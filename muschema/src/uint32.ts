import { MuNumber, MuNumberType } from './_number';
import { MuWriteStream, MuReadStream } from 'mustreams';

export class MuUint32 extends MuNumber {
    public readonly muType:MuNumberType = 'uint32';

    constructor(value?:number) {
        super((value || 0) >>> 0);
    }

    public diffBinary (base:number, target:number, stream:MuWriteStream) {
        if (base !== target) {
            stream.grow(4);
            stream.writeUint32(target);
            return true;
        }
        return false;
    }

    public patchBinary (base:number, stream:MuReadStream) {
        if (stream.bytesLeft() > 3) {
            return stream.readUint32();
        }
        return base;
    }

    public getByteLength (x:MuUint32) {
        return 4;
    }
}
