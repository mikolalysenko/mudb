import HelModel from './model';

export class HelNumber implements HelModel<number> {
    public readonly identity:number;
    public readonly helType:string;

    constructor (helType:string, value:number) {
        this.helType = helType;
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
