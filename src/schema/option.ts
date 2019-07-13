import { MuWriteStream, MuReadStream } from '../stream';
import { MuSchema } from './schema';

enum TypeDiff {
    BECAME_UNDEFINED = 0,
    BECAME_IDENTITY = 1,
    BECAME_DEFINED = 2,
    STAYED_DEFINED = 3,
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
        identityIsUndefined=false,
    ) {
        this.muData = schema;
        if (identityIsUndefined) {
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
            if (this.muData.equal(this.muData.identity, target)) {
                // If value went from undefined to identity, muData.diff will
                // return false and will have written nothing to the stream. So
                // we must remember not to call muData.patch in our patch
                // function since that would make it read from the stream.
                out.writeUint8(TypeDiff.BECAME_IDENTITY);
                return true;
            }
            out.writeUint8(TypeDiff.BECAME_DEFINED);
            this.muData.diff(this.muData.identity, target, out);
            return true;
        }
        if (base !== undefined && target === undefined) {
            out.grow(1);
            out.writeUint8(TypeDiff.BECAME_UNDEFINED);
            return true;
        }
        // Both are defined
        // Making a tradoff here. These invariants are maintained:
        // * If there is no difference in muData
        //   then nothing is written to the stream
        // * If there is a difference in muData
        //   the information about whether the type has changed is written first.
        //   This is because we wrap/hijack the diff return value, and must know
        //   if the indicated difference is ours or muData's.
        //
        //   This causes us to need to do both .equal and .diff instead of only
        //   .diff. Maybe there's a smart way to avoid this, like constructing
        //   an intermediate stream and then appending it to the out stream.
        //   That'd probably only be an improvement for null types, not for
        //   undefined types
        if (this.muData.equal(base, target)) { return false; }
        out.grow(1);
        out.writeUint8(TypeDiff.STAYED_DEFINED);
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
        if (typeDiff == TypeDiff.BECAME_UNDEFINED) { return undefined; }
        if (typeDiff == TypeDiff.BECAME_DEFINED) {
            return this.muData.patch(this.muData.identity, inp);
        }
        if (typeDiff === TypeDiff.BECAME_IDENTITY) {
            return this.muData.clone(this.muData.identity);
        }
        if (typeDiff !== TypeDiff.STAYED_DEFINED || base === undefined) {
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
