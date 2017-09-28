export interface HelSchema<Value> {
    /** Base value type */
    readonly identity:Value;
    
    /** Run time type info */
    readonly helType:string;

    /** Additional schema-specific type info */
    readonly helData?:any;

    /** Allocates a new value */
    alloc ():Value;

    /** Returns a value to the memory pool */
    free (state:Value):void;

    /** Makes a copy of a value */
    clone (state:Value):Value;
    
    /** Computes a patch from base to target */
    diff (base:Value, target:Value):any;

    /** Applies a patch to base */
    patch (base:Value, patch:any):Value;
};