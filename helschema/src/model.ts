export default interface HelModel<State> {
    // Identity state
    readonly identity:State;
    
    // Runtime type info
    readonly helType:string;
    readonly helData?:any;

    // Memory pool
    alloc ():State;
    free (state:State):void;
    clone (state:State):State;
    
    // Patching
    diff (base:State, target:State):any;
    patch (base:State, patch:any):State;
};