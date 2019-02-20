import { MuSchema } from './schema';
import { MuWriteStream, MuReadStream } from '../stream';

/** The empty type */
export class MuVoid implements MuSchema<void> {
    public readonly identity:void = undefined;
    public readonly muType = 'void';
    public readonly json = {
        type: 'void',
    };

    public alloc () : void { }
    public free (_:void) : void { }
    public equal (a:void, b:void) : true { return true; }
    public clone (_:void) : void { }
    public assign (d:void, s:void) : void { }
    public diff (b, t, out:MuWriteStream) : false { return false; }
    public patch (b, inp:MuReadStream) : void { }
    public toJSON (_:void) : null { return null; }
    public fromJSON (_:null) : void { return; }
}
