import { MuNumber } from './_number';
import { MuWriteStream, MuReadStream } from 'mustreams';

export class MuUint8 extends MuNumber {
    public readonly muType = 'uint8';

    constructor(value?:number) {
        super((value || 0) >>> 0);
    }

    public diffBinary (base:number, target:number, stream:MuWriteStream) {
        const bi = base | 0;
        const ti = target | 0;
        if (bi !== ti) {
            stream.grow(1);
            stream.writeUint8(ti);
            return true;
        }
        return false;
    }

    public patchBinary (base:number, stream:MuReadStream) {
        if (stream.bytesLeft() > 0) {
            return stream.readUint8();
        }
        return base;
    }
}
