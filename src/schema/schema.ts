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

    /** Returns `value` to memory pool */
    free (value:Value) : void;

    /** Checks equality of `a` and `b` */
    equal (a:Value, b:Value) : boolean;

    /** Makes a copy of `value` */
    clone (value:Value) : Value;

    /** Assigns `dst` the content of `src` */
    assign (dst:Value, src:Value) : Value;

    /** Computes a binary patch from `base` to `target` */
    diff (base:Value, target:Value, out:MuWriteStream) : boolean;

    /** Applies a binary patch to `base` */
    patch (base:Value, inp:MuReadStream) : Value;

    /** Creates a JSON serializable object from `value` */
    toJSON (value:Value) : any;

    /** Creates a value conforming to schema from `json` */
    fromJSON (json:any) : Value;
}
