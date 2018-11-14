import { MuSchema } from './schema';
import { MuWriteStream, MuReadStream } from '../stream';

/** The empty type */
export class MuVoid implements MuSchema<void> {
    public readonly identity = undefined;
    public readonly muType = 'void';
    public readonly json = {
        type: 'void',
    };

    public alloc () : void { }
    public free (_:void) : void { }
    public equal (x:void, y:void) { return true; }
    public clone (_:void) : void { }
    public copy (s:void, t:void) { }
    public diff (b, t, stream:MuWriteStream) { return false; }
    public patch (b, stream:MuReadStream) : void { }
    public toJSON (_:void) : null { return null; }
    public fromJSON (_:null) : void { return; }
}
