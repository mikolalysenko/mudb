import { MuWriteStream, MuReadStream } from '../stream';
import { MuNumber } from './_number';

export class MuFloat32 extends MuNumber {
    constructor(identity?:number) {
        super(+(identity || 0), 'float32');
    }

    public diff (base:number, target:number, out:MuWriteStream) {
        if (base !== target) {
            out.grow(4);
            out.writeFloat32(target);
            return true;
        }
        return false;
    }

    public patch (base:number, inp:MuReadStream) {
        return inp.readFloat32();
    }
}
