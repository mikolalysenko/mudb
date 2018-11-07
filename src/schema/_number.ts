import { MuSchema } from './schema';
import { MuWriteStream, MuReadStream } from '../stream';

export type MuNumberType =
    'float32' |
    'float64' |
    'int8'    |
    'int16'   |
    'int32'   |
    'uint8'   |
    'uint16'  |
    'uint32';

/** Number type schema */
export abstract class MuNumber implements MuSchema<number> {
    public readonly identity:number;
    public readonly muType:MuNumberType;
    public readonly json:object;

    constructor (value:number, type:MuNumberType) {
        this.identity = value;
        this.muType = type;
        this.json = {
            type: this.muType,
            identity: this.identity,
        };
    }

    public alloc () { return this.identity; }
    public free (_:number) : void { }

    public equal (x:number, y:number) {
        return x === y;
    }

    public clone (x:number) { return x; }

    public copy (source:number, target:number) { }

    public abstract diff (b:number, t:number, stream:MuWriteStream) : boolean;
    public abstract patch (b:number, stream:MuReadStream) : number;
}
