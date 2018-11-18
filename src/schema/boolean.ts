import { MuSchema } from './schema';
import { MuReadStream, MuWriteStream } from '../stream';

/** Boolean type schema */
export class MuBoolean implements MuSchema<boolean> {
    public readonly identity:boolean;
    public readonly muType = 'boolean';
    public readonly json:object;

    constructor (identity?:boolean) {
        this.identity = !!identity;
        this.json = {
            type: 'boolean',
            identity: this.identity,
        };
    }

    public alloc () { return this.identity; }
    public free (bool:boolean) : void { }

    public equal (a:boolean, b:boolean) {
        return a === b;
    }

    public clone (bool:boolean) { return bool; }

    public copy (source:boolean, target:boolean) { }

    public diff (base:boolean, target:boolean, out:MuWriteStream) {
        if (base !== target) {
            out.grow(1);
            out.writeUint8(target ? 1 : 0);
            return true;
        }
        return false;
    }

    public patch (base:boolean, inp:MuReadStream) {
        return !!inp.readUint8();
    }

    public toJSON (bool:boolean) : boolean { return bool; }
    public fromJSON (json:boolean) : boolean { return json; }
}
