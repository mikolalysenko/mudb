import { MuNumber } from './_number';
import { MuWriteStream, MuReadStream } from 'mustreams';

export class MuInt16 extends MuNumber {
    public readonly muType = 'int16';

    constructor(value?:number) {
        super((value || 0) << 16 >> 16);
    }

    public diffBinary (base:number, target:number, stream:MuWriteStream) {
        const bi = base | 0;
        const ti = target | 0;
        if (bi !== ti) {
            stream.grow(2);
            stream.writeInt16(ti);
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
}
