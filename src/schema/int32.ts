import { MuWriteStream, MuReadStream } from '../stream';
import { MuNumber } from './_number';

export class MuInt32 extends MuNumber<'int32'> {
    constructor(identity?:number) {
        super(identity, 'int32');
    }

    public diff (base:number, target:number, out:MuWriteStream) : boolean {
        if (base !== target) {
            out.grow(4);
            out.writeInt32(target);
            return true;
        }
        return false;
    }

    public patch (base:number, inp:MuReadStream) : number {
        return inp.readInt32();
    }
}
