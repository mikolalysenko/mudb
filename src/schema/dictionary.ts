import { MuWriteStream, MuReadStream } from '../stream';

import { MuSchema } from './schema';
import { isMuPrimitiveType } from './type';

export interface Dictionary<Schema extends MuSchema<any>> {
    [key:string]:Schema['identity'];
}

export class MuDictionary<ValueSchema extends MuSchema<any>>
        implements MuSchema<Dictionary<ValueSchema>> {
    public readonly muType = 'dictionary';

    public readonly identity:Dictionary<ValueSchema>;
    public readonly muData:ValueSchema;
    public readonly json:object;
    public readonly capacity:number;

    constructor (
        valueSchema:ValueSchema,
        capacity:number,
        identity?:Dictionary<ValueSchema>,
    ) {
        this.muData = valueSchema;
        this.capacity = capacity;
        this.identity = identity || {};
        this.json = {
            type: 'dictionary',
            valueType: this.muData.json,
            identity: JSON.stringify(this.identity),
        };
    }

    public alloc () : Dictionary<ValueSchema> {
        return {};
    }

    public free (dict:Dictionary<ValueSchema>) {
        const valueSchema = this.muData;
        const props = Object.keys(dict);
        for (let i = 0; i < props.length; ++i) {
            valueSchema.free(dict[props[i]]);
        }
    }

    public equal (a:Dictionary<ValueSchema>, b:Dictionary<ValueSchema>) {
        if (a !== Object(a) || b !== Object(b)) {
            return false;
        }

        const aKeys = Object.keys(a);
        const bKeys = Object.keys(b);

        if (aKeys.length !== bKeys.length) {
            return false;
        }
        for (let i = bKeys.length - 1; i >= 0; --i) {
            if (!(bKeys[i] in a)) {
                return false;
            }
        }

        const valueSchema = this.muData;
        for (let i = 0; i < bKeys.length; ++i) {
            const k = bKeys[i];
            if (!valueSchema.equal(a[k], b[k])) {
                return false;
            }
        }
        return true;
    }

    public clone (dict:Dictionary<ValueSchema>) : Dictionary<ValueSchema> {
        const copy = {};
        const keys = Object.keys(dict);
        const valueSchema = this.muData;
        for (let i = 0; i < keys.length; ++i) {
            const k = keys[i];
            copy[k] = valueSchema.clone(dict[k]);
        }
        return copy;
    }

    public assign (dst:Dictionary<ValueSchema>, src:Dictionary<ValueSchema>) {
        if (dst === src) {
            return;
        }

        const dKeys = Object.keys(dst);
        const sKeys = Object.keys(src);
        const valueSchema = this.muData;

        for (let i = 0; i < dKeys.length; ++i) {
            const k = dKeys[i];
            if (!(k in src)) {
                valueSchema.free(dst[k]);
                delete dst[k];
            }
        }

        if (isMuPrimitiveType(valueSchema.muType)) {
            for (let i = 0; i < sKeys.length; ++i) {
                const k = sKeys[i];
                dst[k] = src[k];
            }
            return;
        }

        for (let i = 0; i < sKeys.length; ++i) {
            const k = sKeys[i];
            if (k in dst) {
                valueSchema.assign(dst[k], src[k]);
            } else {
                dst[k] = valueSchema.clone(src[k]);
            }
        }
    }

    public diff (
        base:Dictionary<ValueSchema>,
        target:Dictionary<ValueSchema>,
        out:MuWriteStream,
    ) : boolean {
        const tProps = Object.keys(target);
        if (tProps.length > this.capacity) {
            throw new RangeError(`number of target properties ${tProps.length} exceeds capacity ${this.capacity}`);
        }

        out.grow(64);

        let numDelete = 0;
        let numPatch = 0;
        let numAdd = 0;

        // mark the initial offset
        const countersOffset = out.offset;
        out.offset += 12;

        const bProps = Object.keys(base);
        for (let i = 0; i < bProps.length; ++i) {
            const prop = bProps[i];
            if (!(prop in target)) {
                out.grow(4 + 2 * prop.length);
                out.writeString(prop);
                ++numDelete;
            }
        }

        const schema = this.muData;
        for (let i = 0; i < tProps.length; ++i) {
            const prefixOffset = out.offset;

            const prop = tProps[i];
            out.grow(4 + 2 * prop.length);
            out.writeString(prop);

            if (prop in base) {
                if (schema.diff(base[prop], target[prop], out)) {
                    ++numPatch;
                } else {
                    out.offset = prefixOffset;
                }
            } else {
                if (!schema.diff(schema.identity, target[prop], out)) {
                    out.buffer.uint8[prefixOffset + 3] |= 0x80;
                }
                ++numPatch;
                ++numAdd;
            }
        }

        if (numPatch > 0 || numDelete > 0) {
            out.writeUint32At(countersOffset, numDelete);
            out.writeUint32At(countersOffset + 4, numPatch);
            out.writeUint32At(countersOffset + 8, numAdd);
            return true;
        } else {
            out.offset = countersOffset;
            return false;
        }
    }

    public patch (
        base:Dictionary<ValueSchema>,
        inp:MuReadStream,
    ) : Dictionary<ValueSchema> {
        const numDelete = inp.readUint32();
        const numPatch = inp.readUint32();
        const numAdd = inp.readUint32();
        const bProps = Object.keys(base);
        const numTargetProps = bProps.length - numDelete + numAdd;
        if (numTargetProps > this.capacity) {
            throw new RangeError(`number of target properties ${numTargetProps} exceeds capacity ${this.capacity}`);
        }

        const propsToDelete = {};
        for (let i = 0; i < numDelete; ++i) {
            propsToDelete[inp.readString()] = true;
        }

        const result = {};
        const schema = this.muData;
        for (let i = 0; i < bProps.length; ++i) {
            const p = bProps[i];
            if (propsToDelete[p]) {
                continue;
            }
            result[p] = schema.clone(base[p]);
        }

        for (let i = 0; i < numPatch; ++i) {
            const isIdentity = inp.buffer.uint8[inp.offset + 3] & 0x80;
            inp.buffer.uint8[inp.offset + 3] &= ~0x80;
            const p = inp.readString();
            if (p in base) {
                result[p] = schema.patch(base[p], inp);
            } else if (isIdentity) {
                result[p] = schema.clone(schema.identity);
            } else {
                result[p] = schema.patch(schema.identity, inp);
            }
        }

        return result;
    }

    public toJSON (dict:Dictionary<ValueSchema>) : Dictionary<any> {
        const json = {};
        const keys = Object.keys(dict);

        const valueSchema = this.muData;
        for (let i = 0; i < keys.length; ++i) {
            const k = keys[i];
            json[k] = valueSchema.toJSON(dict[k]);
        }
        return json;
    }

    public fromJSON (json:Dictionary<any>) : Dictionary<ValueSchema> {
        const dict = {};
        const keys = Object.keys(json);

        const valueSchema = this.muData;
        for (let i = 0; i < keys.length; ++i) {
            const k = keys[i];
            dict[k] = valueSchema.fromJSON(json[k]);
        }
        return dict;
    }
}
