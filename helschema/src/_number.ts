import { MuSchema } from './schema';

/** Number type schema */
export class MuNumber implements MuSchema<number> {
    public readonly identity:number;
    public readonly muType:string;

    constructor (helType:string, value:number) {
        this.muType = helType;
        this.identity = value;
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
