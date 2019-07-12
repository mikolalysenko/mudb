import { MuWriteStream, MuReadStream } from '../stream';
import { MuSchema } from './schema';

enum TypeDiff {
    became_undefined = 0,
    became_defined = 1,
    stayed_defined = 2,
}

export class MuOption<ValueSchema extends MuSchema<any>>
        implements MuSchema<ValueSchema['identity']|undefined> {

    public readonly muType = 'option';
    public readonly identity:ValueSchema['identity']|undefined;
    public readonly muData:ValueSchema;
    public readonly json:object;

    /**
     * Invoke with (Schema) to set identity to Schema.identity
     * Invoke with (Schema, Object) to set identity to Object
     * Invoke with (Schema, undefined, true) to set identity to `undefined`
     */
    constructor (
        schema:ValueSchema,
        identity?:ValueSchema['identity'],
        identity_is_undefined=false,
    ) {
        this.muData = schema;
        if (identity_is_undefined) {
            this.identity = undefined;
        } else {
            this.identity = identity !== undefined ? schema.clone(identity) : schema.clone(schema.identity);
        }
        this.json = {
            type: 'option',
            valueType: schema.json,
            identity: JSON.stringify(this.identity),
        };
    }

    public alloc () : ValueSchema['identity'] {
        return this.muData.alloc();
    }

    public free (val:ValueSchema['identity']|undefined) : void {
        if (val === undefined) { return; }
        this.muData.free(val);
    }

    public equal (
        a:ValueSchema['identity']|undefined,
        b:ValueSchema['identity']|undefined,
    ) : boolean {
        if (a === undefined && b === undefined) { return true; }
        if (a !== undefined && b === undefined) { return false; }
        if (a === undefined && b !== undefined) { return false; }
        return this.muData.equal(a, b);
    }

    public clone (val:ValueSchema['identity']|undefined) : ValueSchema['identity']|undefined {
        if (val === undefined) { return undefined; }
        return this.muData.clone(val);
    }

    public assign (
        dst:ValueSchema['identity']|undefined,
        src:ValueSchema['identity']|undefined,
    ) : ValueSchema['identity'] {
        if (dst !== undefined && src !== undefined) {
            return this.muData.assign(dst, src);
        }
        return src;
    }

    public diff (
        base:ValueSchema['identity']|undefined,
        target:ValueSchema['identity']|undefined,
        out:MuWriteStream,
    ) : boolean {
        if (base === undefined && target === undefined) { return false; }
        if (base === undefined && target !== undefined) {
            out.grow(1);
            out.writeUint8(TypeDiff.became_defined);
            this.muData.diff(this.muData.identity, target, out);
            return true;
        }
        if (base !== undefined && target === undefined) {
            out.grow(1);
            out.writeUint8(TypeDiff.became_undefined);
            return true;
        }
        // Both are defined
        // Making a tradoff here. These invariants are maintained:
        // * If there is no difference, nothing is written to the stream
        // * If there is a difference, the information about whether the type
        //   has changed is written first.
        //
        //   This causes us to need to do both .equal and .diff instead of only
        //   .diff. Maybe there's a smart way to avoid this, like constructing
        //   an intermediate stream and then appending it to the out stream.
        //   That'd probably only be an improvement for null types, not for
        //   undefined types
        if (this.muData.equal(base, target)) { return false; }
        out.grow(1);
        out.writeUint8(TypeDiff.stayed_defined);
        this.muData.diff(base, target, out);
        return true;
    }

    public patch (
        base:ValueSchema['identity']|undefined,
        inp:MuReadStream,
    ) : ValueSchema['identity']|undefined {
        const typeDiff = inp.readUint8();
        if (TypeDiff[typeDiff] === undefined) {
            throw new Error('Panic in muOption, invalid TypeDiff');
        }
        if (typeDiff == TypeDiff.became_undefined) { return undefined; }
        if (typeDiff == TypeDiff.became_defined) {
            return this.muData.patch(this.muData.identity, inp);
        }
        if (typeDiff !== TypeDiff.stayed_defined || base === undefined) {
            throw new Error('Panic in muOption, invariants broken');
        }
        return this.muData.patch(base, inp);
    }

    public toJSON (val:ValueSchema['identity']|undefined) : ReturnType<ValueSchema['toJSON']>|undefined {
        if (val === undefined) { return undefined; }
        return this.muData.toJSON(val);
    }

    public fromJSON (json:any) : ValueSchema['identity']|undefined {
        if (json === undefined) { return undefined; }
        return this.muData.fromJSON(json);
    }
}
