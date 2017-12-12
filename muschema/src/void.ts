import { MuSchema } from './schema';
import { MuWriteStream, MuReadStream } from 'mustreams';

/** The empty type */
export class MuVoid implements MuSchema<void> {
    public readonly identity:void;
    public readonly muType = 'void';
    public readonly json = {
        type: 'void',
    };

    public alloc () : void {}
    public free () : void {}
    public clone () : void {}
    public diffBinary (b, t, stream:MuWriteStream) { return false; }
    public patchBinary (b, stream:MuReadStream) : void {}
    public getByteLength () { return 0; }
    public diff (b, t) : void {}
    public patch (b, p) : void {}
}
