import { MuSchema } from './schema';
import { MuReadStream, MuWriteStream } from 'mustreams';

/** Boolean type schema */
export class MuBoolean implements MuSchema<boolean> {
    public readonly identity:boolean;
    public readonly muType = 'boolean';
    public readonly json:object;

    constructor (id?:boolean) {
        this.identity = !!id;
        this.json = {
            type: 'boolean',
            identity: this.identity,
        };
    }

    alloc () { return this.identity }
    free () { }
    clone (x:boolean) { return x }

    diff (a:boolean, b:boolean) {
        if (a !== b) {
            return b;
        }
        return;
    }

    patch (a:boolean, b: boolean) {
        return !!b;
    }

    diffBinary (a:boolean, b:boolean, stream:MuWriteStream) {
        if (a !== b) {
            stream.grow(1);
            stream.writeUint8(b ? 1 : 0);
            return true;          
        }
        return false;
    }

    patchBinary (a:boolean, stream:MuReadStream) {
        if (stream.bytesLeft() > 0) {
            return !!stream.readUint8();
        } else {
            return a;
        }
    }
}