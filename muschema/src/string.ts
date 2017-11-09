import { MuSchema } from './schema';
import { MuReadStream, MuWriteStream } from 'mustreams';

/** String type schema */
export class MuString implements MuSchema<string> {
    public readonly identity:string;
    public readonly muType = 'string';
    public readonly json:object;

    constructor (identity?:string) {
        this.identity = identity || '';
        this.json = {
            type: 'string',
            identity: this.identity,
        };
    }

    public alloc () { return this.identity; }
    public free () {}
    public clone (x:string) { return x; }

    public diff (a:string, b:string) {
        if (a !== b) {
            return b;
        }
        return;
    }

    public patch (a:string, b:any) {
        if (typeof b === 'string') {
            return b;
        }
        return '';
    }

    public diffBinary (a:string, b:string, stream:MuWriteStream) {
        if (a !== b) {
            stream.grow(4 + 4 * b.length);
            stream.writeString(b);
            return true;
        }
        return false;
    }

    public patchBinary (a:string, stream:MuReadStream) {
        if (stream.bytesLeft() > 0) {
            return stream.readString();
        }
        return a;
    }
}
