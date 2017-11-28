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

    public alloc () { return this.identity; }
    public free () { }
    public clone (b:boolean) { return b; }

    public diff (a:boolean, b:boolean) {
        if (a !== b) {
            return b;
        }
        return;
    }

    public patch (a:boolean, b:boolean) {
        return !!b;
    }

    public diffBinary (a:boolean, b:boolean, stream:MuWriteStream) {
        if (a !== b) {
            stream.grow(1);
            stream.writeUint8(b ? 1 : 0);
            return true;
        }
        return false;
    }

    public patchBinary (a:boolean, stream:MuReadStream) {
        if (stream.bytesLeft() > 0) {
            return !!stream.readUint8();
        } else {
            return a;
        }
    }

    public getByteLength (b:MuBoolean) {
        return 1;
    }
}
