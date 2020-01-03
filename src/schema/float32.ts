import { MuWriteStream, MuReadStream } from '../stream';
import { MuNumber } from './_number';

export class MuFloat32 extends MuNumber<'float32'> {
    constructor(identity?:number) {
        super(identity, 'float32');
    }

    public diff (base:number, target:number, out:MuWriteStream) : boolean {
        if (base !== target) {
            out.grow(4);
            out.writeFloat32(target);
            return true;
        }
        return false;
    }

    public patch (base:number, inp:MuReadStream) : number {
        return inp.readFloat32();
    }
}
