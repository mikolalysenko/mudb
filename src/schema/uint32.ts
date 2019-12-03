import { MuWriteStream, MuReadStream } from '../stream';
import { MuNumber } from './_number';

export class MuUint32 extends MuNumber<'uint32'> {
    constructor(identity?:number) {
        super(identity, 'uint32');
    }

    public diff (base:number, target:number, out:MuWriteStream) : boolean {
        if (base !== target) {
            out.grow(4);
            out.writeUint32(target);
            return true;
        }
        return false;
    }

    public patch (base:number, inp:MuReadStream) : number {
        return inp.readUint32();
    }
}
