import Model from './model';

export default <Model<number, number>> {
    identity: 0,
    _delta: NaN,
    alloc () { return 0 },
    free (x:number) { },
    clone (x:number) { return x; },
    diff (s:number, t:number) {
        if (s !== t) {
            return t; 
        }
        return;
    },
    patch(s:number, p:number) { return p; },
    _helType: 'number'
};