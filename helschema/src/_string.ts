import {HelSchema} from './schema';

/** String type schema */
export class HelString implements HelSchema<string> {
    public readonly identity:string;
    public readonly helType = 'string';

    constructor (identity) {
        this.identity = identity;
    }
    
    public alloc () { return this.identity }
    public free () {}
    public clone (x:string) { return x }
    
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
}