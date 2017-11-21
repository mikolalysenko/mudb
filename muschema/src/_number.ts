import { MuSchema } from './schema';

export type MuNumberType =
    'float64' |
    'float32' |
    'int8'    |
    'int16'   |
    'int32'   |
    'uint8'   |
    'uint16'  |
    'uint32';

/** Number type schema */
export class MuNumber implements MuSchema<number> {
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

    public diff (s:number, t:number) {
        if (s !== t) {
            return t;
        }
        return;
    }
    public patch (s:number, p:number) { return p; }
}
