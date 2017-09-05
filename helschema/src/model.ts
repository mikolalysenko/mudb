export default interface HelModel<State, Delta> {
    // Identity state
    readonly identity:State;

    // Empty delta
    readonly _delta:Delta;
    
    // Memory pool
    alloc ():State;
    free (state:State):void;
    clone (state:State):State;
    
    // Patching
    diff (base:State, target:State):(Delta | undefined);
    patch (base:State, patch:Delta):State;
};