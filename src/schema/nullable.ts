import { MuWriteStream, MuReadStream } from '../stream';
import { MuSchema } from './schema'

enum TypeDiff {
    BECAME_NULL = 0,
    BECAME_IDENTITY = 1,
    BECAME_NOTNULL = 2,
    STAYED_NOTNULL = 3,
}

export class MuNullable<ValueSchema extends MuSchema<any>> implements MuSchema<ValueSchema['identity']|null> {
    public readonly muType = 'nullable';
    public readonly identity:ValueSchema['identity']|null;
    public readonly muData:ValueSchema;
    public readonly json:object;

    constructor (
        schema:ValueSchema,
        identity:ValueSchema['identity']|null = null,
        identityIsNull=false,
    ) {
        this.muData = schema;
        if (identityIsNull) {
            this.identity = null;
        } else {
            this.identity = identity !== null ? schema.clone(identity) : schema.clone(schema.identity);
        }
        this.json = {
            type: 'nullable',
            valueType: schema.json,
            identity: JSON.stringify(this.identity),
        };
    }

    public alloc () : ValueSchema['identity'] {
        return this.muData.alloc();
    }

    public free (val:ValueSchema['identity']|null) : void {
        if (val === null) { return; }
        this.muData.free(val);
    }

    public equal (
        a:ValueSchema['identity']|null,
        b:ValueSchema['identity']|null,
    ) : boolean {
        if (a === b && a === null) { return true; }
        if (a === null || b === null) { return false; }
        return this.muData.equal(a, b);
    }

    public clone (val:ValueSchema['identity']|null) : ValueSchema['identity']|null {
        if (val === null) { return null; }
        return this.muData.clone(val);
    }

    public assign (
        dst:ValueSchema['identity']|null,
        src:ValueSchema['identity']|null,
    ) : ValueSchema['identity'] {
        if (dst !== null && src !== null) {
            return this.muData.assign(dst, src);
        }
        return src;
    }

    public diff (
        base:ValueSchema['identity']|null,
        target:ValueSchema['identity']|null,
        out:MuWriteStream,
    ) : boolean {
        if (base === null && target === null) { return false; }
        if (base === null && target !== null) {
            out.grow(1);
            if (this.muData.equal(this.muData.identity, target)) {
                out.writeUint8(TypeDiff.BECAME_IDENTITY);
                return true;
            }
            out.writeUint8(TypeDiff.BECAME_NOTNULL);
            this.muData.diff(this.muData.identity, target, out);
            return true;
        }
        if (base !== null && target === null) {
            out.grow(1);
            out.writeUint8(TypeDiff.BECAME_NULL);
            return true;
        }
        if (this.muData.equal(base, target)) { return false; }
        out.grow(1);
        out.writeUint8(TypeDiff.STAYED_NOTNULL);
        this.muData.diff(base, target, out);
        return true;
    }

    public patch (
        base:ValueSchema['identity']|null,
        inp:MuReadStream,
    ) : ValueSchema['identity']|null {
        const typeDiff = inp.readUint8();
        if (TypeDiff[typeDiff] === undefined) {
            throw new Error('Panic in muNullable, invalid TypeDiff');
        }
        if (typeDiff === TypeDiff.BECAME_NULL) { return null; }
        if (typeDiff === TypeDiff.BECAME_NOTNULL) {
            return this.muData.patch(this.muData.identity, inp);
        }
        if (typeDiff === TypeDiff.BECAME_IDENTITY) {
            return this.muData.clone(this.muData.identity);
        }
        if (typeDiff !== TypeDiff.STAYED_NOTNULL || base === null) {
            throw new Error('Panic in muNullable, invariants broken');
        }
        return this.muData.patch(base, inp);
    }

    public toJSON (val:ValueSchema['identity']|null) : ReturnType<ValueSchema['toJSON']>|null {
        if (val === null) { return null; }
        return this.muData.toJSON(val);
    }

    public fromJSON (json:any) : ValueSchema['identity']|null {
        if (json === null) { return null; }
        return this.muData.fromJSON(json);
    }
}