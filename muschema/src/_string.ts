import {MuSchema} from './schema';

/** String type schema */
export class MuString implements MuSchema<string> {
    public readonly identity:string;
    public readonly muType = 'string';
    public readonly json:object;

    constructor (identity) {
        this.identity = identity;
        this.json = {
            type: 'string',
            identity: this.identity
        };
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