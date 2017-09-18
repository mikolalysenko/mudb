export default interface HelModel<State> {
    // Identity state
    readonly identity:State;
    
    // hel type
    readonly _helType:string;

    // Memory pool
    alloc ():State;
    free (state:State):void;
    clone (state:State):State;
    
    // Patching
    diff (base:State, target:State):any;
    patch (base:State, patch:any):State;
};