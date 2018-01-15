import { MuReadStream, MuWriteStream } from 'mustreams';

export interface MuSchema<Value> {
    /** Base value type */
    readonly identity:Value;

    /** Run time type info */
    readonly muType:string;

    /** Additional schema-specific type info */
    readonly muData?:any;

    /** Converts schema to a JSON description.  Used to compare schemas */
    readonly json:object;

    /** Allocates a new value */
    alloc () : Value;

    /** Returns a value to the memory pool */
    free (state:Value) : void;

    /** Makes a copy of a value */
    clone (state:Value) : Value;

    /** Computes a patch from base to target */
    diff (base:Value, target:Value) : any;

    /** Applies a patch to base */
    patch (base:Value, patch:any) : Value;

    /** Computes a binary patch */
    diffBinary (base:Value, target:Value, out:MuWriteStream) : boolean;

    /** Apply a patch to an object */
    patchBinary (base:Value, inp:MuReadStream) : Value;

    calcByteLength (x:any) : number;
}
