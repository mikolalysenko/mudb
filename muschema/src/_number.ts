import { MuSchema } from './schema';
import { MuWriteStream, MuReadStream } from 'mustreams';

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

    constructor (value:number) {
        this.identity = value;
        this.json = {
            type: this.muType,
            identity: this.identity,
        };
    }

    public alloc () { return this.identity; }
    public free (x:number) { }
    public clone (x:number) { return x; }

    public abstract diffBinary (b:number, t:number, stream:MuWriteStream) : boolean;
    public abstract patchBinary (b:number, stream:MuReadStream) : number;

    public abstract calcByteLength(x:MuNumber);
}
