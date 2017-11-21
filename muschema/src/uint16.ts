import { MuNumber, MuNumberType } from './_number';
import { MuWriteStream, MuReadStream } from 'mustreams';

export class MuUint16 extends MuNumber {
    public readonly muType:MuNumberType = 'uint16';

    constructor(value?:number) {
        super((value || 0) & 0xFFFF);
    }

    public diffBinary (base:number, target:number, stream:MuWriteStream) {
        const bi = base | 0;
        const ti = target | 0;
        if (bi !== ti) {
            stream.grow(2);
            stream.writeUint16(ti);
            return true;
        }
        return false;
    }

    public patchBinary (base:number, stream:MuReadStream) {
        if (stream.bytesLeft() > 1) {
            return stream.readUint16();
        }
        return base;
    }

    public getByteLength (x:MuUint16) {
        return 2;
    }
}
