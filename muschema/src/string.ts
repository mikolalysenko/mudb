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

    public diffBinary (base:string, target:string, stream:MuWriteStream) {
        if (base !== target) {
            stream.grow(4 + 4 * target.length);
            stream.writeString(target);
            return true;
        }
        return false;
    }

    public patchBinary (base:string, stream:MuReadStream) {
        if (stream.bytesLeft() > 4) {
            return stream.readString();
        }
        return base;
    }

    public getByteLength (str:string) {
        return 4 + str.length * 4;
    }
}
