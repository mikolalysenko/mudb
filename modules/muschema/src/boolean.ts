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
    public free (_:boolean) : void { }

    public equal (x:boolean, y:boolean) {
        return x === y;
    }

    public clone (b:boolean) { return b; }

    public copy (source:boolean, target:boolean) { }

    public diff (a:boolean, b:boolean, stream:MuWriteStream) {
        if (a !== b) {
            stream.grow(1);
            stream.writeUint8(b ? 1 : 0);
            return true;
        }
        return false;
    }

    public patch (a:boolean, stream:MuReadStream) {
        return !!stream.readUint8();
    }
}
