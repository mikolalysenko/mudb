import { MuReadStream, MuWriteStream } from '../stream';

export interface MuSchema<Value> {
    /** Base value */
    readonly identity:Value;

    /** Run time type info */
    readonly muType:string;

    /** Additional schema-specific type info */
    readonly muData?:any;

    /** JSON description of schema, used to compare schemas */
    readonly json:object;

    /** Allocates a new value */
    alloc () : Value;

    /** Returns value to memory pool */
    free (value:Value) : void;

    /** Checks equality of two values */
    equal (base:Value, target:Value) : boolean;

    /** Makes a copy of value */
    clone (value:Value) : Value;

    /** Copies content of source to target */
    copy (source:Value, target:Value) : void;

    /** Computes a binary patch */
    diff (base:Value, target:Value, out:MuWriteStream) : boolean;

    /** Applies a binary patch to base */
    patch (base:Value, inp:MuReadStream) : Value;

    /** Creates a JSON serializable object from value */
    toJSON (value:Value) : any;

    /** Creates a value conformed to schema from json */
    fromJSON (json:any) : Value;
}
