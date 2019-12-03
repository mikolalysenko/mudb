import { MuWriteStream, MuReadStream } from '../stream';
import { MuNumber } from './_number';

export class MuUint8 extends MuNumber<'uint8'> {
    constructor(identity?:number) {
        super(identity, 'uint8');
    }

    public diff (base:number, target:number, out:MuWriteStream) : boolean {
        if (base !== target) {
            out.grow(1);
            out.writeUint8(target);
            return true;
        }
        return false;
    }

    public patch (base:number, inp:MuReadStream) : number {
        return inp.readUint8();
    }
}
