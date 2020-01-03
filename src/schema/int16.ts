import { MuWriteStream, MuReadStream } from '../stream';
import { MuNumber } from './_number';

export class MuInt16 extends MuNumber<'int16'> {
    constructor(identity?:number) {
        super(identity, 'int16');
    }

    public diff (base:number, target:number, out:MuWriteStream) : boolean {
        if (base !== target) {
            out.grow(2);
            out.writeInt16(target);
            return true;
        }
        return false;
    }

    public patch (base:number, inp:MuReadStream) : number {
        return inp.readInt16();
    }
}
