import { MuReadStream, MuWriteStream } from '../stream';

export interface MuSchema<Value> {
    /** Base value */
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

    /** Checks equality of two values */
    equal (base:Value, target:Value) : boolean;

    /** Makes a copy of a value */
    clone (state:Value) : Value;

    /** Copies source to target */
    copy (source:Value, target:Value) : void;

    /** Computes a binary patch */
    diff (base:Value, target:Value, out:MuWriteStream) : boolean;

    /** Apply a patch to an object */
    patch (base:Value, inp:MuReadStream) : Value;
}
