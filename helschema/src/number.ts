import Model from './model';

export default <Model<number, number>> {
    identity: 0,
    create (x:number) { return x; }, 
    clone (x:number) { return x; },
    free (x:number) { },
    diff (s:number, t:number) {
        if (s !== t) {
            return t; 
        }
        return;
    },
    patch(s:number, p:number) { return p; },
    interpolate(a:number, b:number, t:number) {
        return (1 - t) * a + t * b;
    },
    _helType: 'number'
};