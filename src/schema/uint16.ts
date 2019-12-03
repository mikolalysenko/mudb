import { MuWriteStream, MuReadStream } from '../stream';
import { MuNumber } from './_number';

export class MuUint16 extends MuNumber<'uint16'> {
    constructor(identity?:number) {
        super(identity, 'uint16');
    }

    public diff (base:number, target:number, out:MuWriteStream) : boolean {
        if (base !== target) {
            out.grow(2);
            out.writeUint16(target);
            return true;
        }
        return false;
    }

    public patch (base:number, inp:MuReadStream) : number {
        return inp.readUint16();
    }
}
