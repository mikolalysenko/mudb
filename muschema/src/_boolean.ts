import { MuSchema } from './schema';

/** Boolean type schema */
export class MuBoolean implements MuSchema<boolean> {
    public readonly identity:boolean;
    public readonly muType = 'boolean';

    constructor (id:boolean) {
        this.identity = id;
    }

    alloc () { return this.identity }
    free () { }
    clone (x:boolean) { return x }

    diff (a:boolean, b:boolean) {
        if (a !== b) {
            return b;
        }
        return;
    }

    patch (a:boolean, b: boolean) {
        return !!b;
    }
}