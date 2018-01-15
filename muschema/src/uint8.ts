import { MuNumber, MuNumberType } from './_number';
import { MuWriteStream, MuReadStream } from 'mustreams';

export class MuUint8 extends MuNumber {
    public readonly muType:MuNumberType = 'uint8';

    constructor(value?:number) {
        super((value || 0) & 0xFF);
    }

    public diff (base:number, target:number, stream:MuWriteStream) {
        if (base !== target) {
            stream.grow(1);
            stream.writeUint8(target);
            return true;
        }
        return false;
    }

    public patch (base:number, stream:MuReadStream) {
        return stream.readUint8();
    }

    public calcByteLength (x:MuUint8) {
        return 1;
    }
}
