import { MuNumber } from './_number';
import { MuWriteStream, MuReadStream } from '../stream';

export class MuVarint extends MuNumber<'varint'> {
    constructor (identity?:number) {
        super(identity, 'varint');
    }

    public diff (base:number, target:number, out:MuWriteStream) : boolean {
        if (base !== target) {
            out.grow(5);
            out.writeVarint(target);
            return true;
        }
        return false;
    }

    public patch (base:number, inp:MuReadStream) : number {
        return inp.readVarint();
    }
}
