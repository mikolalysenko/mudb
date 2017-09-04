export default interface Model<State, Delta> {
    // Identity state
    readonly identity:State;

    // Empty delta
    readonly _delta?:Delta;
    
    // Memory pool
    alloc ():State;
    clone (state:State):State;
    free (state:State):void;
    
    // Patching
    diff (base:State, target:State):(Delta | undefined);
    patch (base:State, patch:Delta):State;

    // Interpolation
    interpolate (s0:State, t0:number, s1:State, t1:number, t:number):State;
};