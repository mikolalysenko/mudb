import { MuNumber, MuNumberType } from './_number';
import { MuWriteStream, MuReadStream } from 'mustreams';

export class MuInt32 extends MuNumber {
    public readonly muType:MuNumberType = 'int32';

    constructor(value?:number) {
        super((value || 0) << 0);
    }

    public diffBinary (base:number, target:number, stream:MuWriteStream) {
        const bi = base | 0;
        const ti = target | 0;
        if (bi !== ti) {
            stream.grow(4);
            stream.writeInt32(ti);
            return true;
        }
        return false;
    }

    public patchBinary (base:number, stream:MuReadStream) {
        if (stream.bytesLeft() > 3) {
            return stream.readInt32();
        }
        return base;
    }

    public getByteLength (x:MuInt32) {
        return 4;
    }
}
