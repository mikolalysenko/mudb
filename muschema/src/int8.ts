import {MuNumber} from './_number';
import {MuWriteStream, MuReadStream} from 'mustream';

export class MuInt8 extends MuNumber {
    public readonly muType = 'int8';
    constructor(value?:number) {
        super((value || 0) | 0);
    }

    public diffBinary (a:number, b:number, stream:MuWriteStream) {
        const ai = a | 0;
        const bi = b | 0;
        if (ai !== bi) {
            stream.grow(1);
            stream.writeInt8(bi);
            return true;
        }
        return false;
    }

    public patchBinary (a:number, stream:MuReadStream) {
        if (stream.bytesLeft() > 0) {
            return stream.readInt8();
        }
        return a;
    }
};