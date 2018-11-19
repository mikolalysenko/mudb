import { MuSchema } from './schema';
import { MuReadStream, MuWriteStream } from '../stream';

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

    public alloc () {
        return this.identity;
    }

    public free (str:string) : void { }

    public equal (a:string, b:string) {
        return a === b;
    }

    public clone (str:string) {
        return str;
    }

    public copy (source:string, target:string) { }

    public diff (base:string, target:string, stream:MuWriteStream) {
        if (base !== target) {
            stream.grow(4 + 4 * target.length);
            stream.writeString(target);
            return true;
        }
        return false;
    }

    public patch (base:string, stream:MuReadStream) {
        return stream.readString();
    }

    public toJSON (str:string) : string {
        return str;
    }

    public fromJSON (json:string) : string {
        return json;
    }
}
