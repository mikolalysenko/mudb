import { MuNumber, MuNumberType } from './_number';
import { MuWriteStream, MuReadStream } from 'mustreams';

export class MuFloat64 extends MuNumber {
    constructor(value?:number) {
        super(+(value || 0), 'float64');
    }

    public diff (base:number, target:number, stream:MuWriteStream) {
        if (base !== target) {
            stream.grow(8);
            stream.writeFloat64(target);
            return true;
        }
        return false;
    }

    public patch (base:number, stream:MuReadStream) {
        return stream.readFloat64();
    }
}
