import { MuNumber, MuNumberType } from './_number';
import { MuWriteStream, MuReadStream } from '../stream';

export class MuFloat32 extends MuNumber {
    constructor(value?:number) {
        super(+(value || 0), 'float32');
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
}
