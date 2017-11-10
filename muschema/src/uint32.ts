import { MuNumber } from './_number';
import { MuWriteStream, MuReadStream } from 'mustreams';

export class MuUint32 extends MuNumber {
    public readonly muType = 'uint32';

    constructor(value?:number) {
        super((value || 0) >>> 0);
    }

    public diffBinary (base:number, target:number, stream:MuWriteStream) {
        const bi = base | 0;
        const ti = target | 0;
        if (bi !== ti) {
            stream.grow(4);
            stream.writeUint32(ti);
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
}
