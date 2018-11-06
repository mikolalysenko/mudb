import { MuNumber, MuNumberType } from './_number';
import { MuWriteStream, MuReadStream } from '../stream';

export class MuUint32 extends MuNumber {
    constructor(value?:number) {
        super((value || 0) >>> 0, 'uint32');
    }

    public diff (base:number, target:number, stream:MuWriteStream) {
        if ((base >>> 0) !== (target >>> 0)) {
            stream.grow(4);
            stream.writeUint32(target);
            return true;
        }
        return false;
    }

    public patch (base:number, stream:MuReadStream) {
        return stream.readUint32();
    }
}
