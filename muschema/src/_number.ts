import { MuSchema } from './schema';

/** Number type schema */
export class MuNumber implements MuSchema<number> {
    public readonly identity:number;
    public readonly muType:string;
    public readonly json:object;

    constructor (value:number) {
        this.identity = value;
        this.json = {
            type: this.muType,
            identity: this.identity,
        };
    }

    alloc () { return this.identity }
    free (x:number) { }
    clone (x:number) { return x; }

    diff (s:number, t:number) {
        if (s !== t) {
            return t; 
        }
        return;
    }
    patch(s:number, p:number) { return p; }
}
