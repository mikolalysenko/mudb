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
        schema:ValueSchema,
        capacity:number,
        identity?:Dictionary<ValueSchema>,
    ) {
        this.muData = schema;
        this.capacity = capacity;
        this.identity = identity || {};
        this.json = {
            type: 'dictionary',
            valueType: schema.json,
            identity: JSON.stringify(this.identity),
        };
    }

    public alloc () : Dictionary<ValueSchema> {
        return {};
    }

    public free (dict:Dictionary<ValueSchema>) {
        const schema = this.muData;
        const props = Object.keys(dict);
        for (let i = 0; i < props.length; ++i) {
            schema.free(dict[props[i]]);
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

        const schema = this.muData;
        for (let i = 0; i < bKeys.length; ++i) {
            const k = bKeys[i];
            if (!schema.equal(a[k], b[k])) {
                return false;
            }
        }
        return true;
    }

    public clone (dict:Dictionary<ValueSchema>) : Dictionary<ValueSchema> {
        const copy = {};
        const keys = Object.keys(dict);
        const schema = this.muData;
        for (let i = 0; i < keys.length; ++i) {
            const k = keys[i];
            copy[k] = schema.clone(dict[k]);
        }
        return copy;
    }

    public assign (dst:Dictionary<ValueSchema>, src:Dictionary<ValueSchema>) {
        if (dst === src) {
            return;
        }

        const dKeys = Object.keys(dst);
        const sKeys = Object.keys(src);
        const schema = this.muData;

        for (let i = 0; i < dKeys.length; ++i) {
            const k = dKeys[i];
            if (!(k in src)) {
                schema.free(dst[k]);
                delete dst[k];
            }
        }

        if (isMuPrimitiveType(schema.muType)) {
            for (let i = 0; i < sKeys.length; ++i) {
                const k = sKeys[i];
                dst[k] = src[k];
            }
            return;
        }

        for (let i = 0; i < sKeys.length; ++i) {
            const k = sKeys[i];
            if (k in dst) {
                schema.assign(dst[k], src[k]);
            } else {
                dst[k] = schema.clone(src[k]);
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

        const head = out.offset;
        out.offset += 8;

        let numDelete = 0;
        let numPatch = 0;

        const bProps = Object.keys(base);
        for (let i = 0; i < bProps.length; ++i) {
            const prop = bProps[i];
            if (!(prop in target)) {
                out.grow(4 + 4 * prop.length);
                out.writeString(prop);
                ++numDelete;
            }
        }

        const schema = this.muData;
        for (let i = 0; i < tProps.length; ++i) {
            const start = out.offset;

            const prop = tProps[i];
            out.grow(4 + 2 * prop.length);
            out.writeString(prop);

            if (prop in base) {
                if (schema.diff(base[prop], target[prop], out)) {
                    ++numPatch;
                } else {
                    out.offset = start;
                }
            } else {
                if (!schema.diff(schema.identity, target[prop], out)) {
                    out.buffer.uint8[start + 3] |= 0x80;
                }
                ++numPatch;
            }
        }

        if (numDelete > 0 || numPatch > 0) {
            out.writeUint32At(head, numDelete);
            out.writeUint32At(head + 4, numPatch);
            return true;
        }
        out.offset = head;
        return false;
    }

    public patch (
        base:Dictionary<ValueSchema>,
        inp:MuReadStream,
    ) : Dictionary<ValueSchema> {
        const numDelete = inp.readUint32();
        const numPatch = inp.readUint32();

        const bKeys = Object.keys(base);
        const numBaseProps = bKeys.length;
        if (numDelete > numBaseProps) {
            throw new Error(`invalid number of deletions ${numDelete}`);
        }

        const propsToDelete = {};
        for (let i = 0; i < numDelete; ++i) {
            const key = inp.readString();
            if (!(key in base)) {
                throw new Error(`invalid key ${key}`);
            }
            propsToDelete[key] = true;
        }

        const result = {};
        const schema = this.muData;
        for (let i = 0; i < numBaseProps; ++i) {
            const key = bKeys[i];
            if (propsToDelete[key]) {
                continue;
            }
            result[key] = schema.clone(base[key]);
        }
        for (let i = 0; i < numPatch; ++i) {
            const isIdentity = inp.buffer.uint8[inp.offset + 3] & 0x80;
            inp.buffer.uint8[inp.offset + 3] &= ~0x80;
            const key = inp.readString();
            if (key in base) {
                result[key] = schema.patch(base[key], inp);
            } else if (isIdentity) {
                result[key] = schema.clone(schema.identity);
            } else {
                result[key] = schema.patch(schema.identity, inp);
            }
        }
        return result;
    }

    public toJSON (dict:Dictionary<ValueSchema>) : Dictionary<any> {
        const json = {};
        const keys = Object.keys(dict);

        const schema = this.muData;
        for (let i = 0; i < keys.length; ++i) {
            const k = keys[i];
            json[k] = schema.toJSON(dict[k]);
        }
        return json;
    }

    public fromJSON (json:Dictionary<any>) : Dictionary<ValueSchema> {
        const dict = {};
        const keys = Object.keys(json);

        const schema = this.muData;
        for (let i = 0; i < keys.length; ++i) {
            const k = keys[i];
            dict[k] = schema.fromJSON(json[k]);
        }
        return dict;
    }
}
