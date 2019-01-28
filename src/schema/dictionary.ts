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
        this.identity = {};
        if (identity) {
            const keys = Object.keys(identity);
            for (let i = 0; i < keys.length; ++i) {
                const k = keys[i];
                this.identity[k] = schema.clone(identity[k]);
            }
        }
        this.json = {
            type: 'dictionary',
            valueType: schema.json,
            identity: JSON.stringify(this.identity),
        };
    }

    public alloc () : Dictionary<ValueSchema> {
        return {};
    }

    public free (dict:Dictionary<ValueSchema>) : void {
        const props = Object.keys(dict);
        const schema = this.muData;
        for (let i = 0; i < props.length; ++i) {
            schema.free(dict[props[i]]);
        }
    }

    public equal (
        a:Dictionary<ValueSchema>,
        b:Dictionary<ValueSchema>,
    ) : boolean {
        const aKeys = Object.keys(a);
        const bKeys = Object.keys(b);

        if (aKeys.length !== bKeys.length) {
            return false;
        }
        for (let i = aKeys.length - 1; i >= 0; --i) {
            if (!(aKeys[i] in b)) {
                return false;
            }
        }

        const schema = this.muData;
        for (let i = 0; i < aKeys.length; ++i) {
            const k = aKeys[i];
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

    public assign (
        dst:Dictionary<ValueSchema>,
        src:Dictionary<ValueSchema>,
    ) : Dictionary<ValueSchema> {
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
            return dst;
        }

        for (let i = 0; i < sKeys.length; ++i) {
            const k = sKeys[i];
            if (k in dst) {
                schema.assign(dst[k], src[k]);
            } else {
                dst[k] = schema.clone(src[k]);
            }
        }
        return dst;
    }

    public diff (
        base:Dictionary<ValueSchema>,
        target:Dictionary<ValueSchema>,
        out:MuWriteStream,
    ) : boolean {
        out.grow(12);
        const head = out.offset;
        out.offset += 12;

        let numDel = 0;
        let numPatch = 0;
        let numAdd = 0;

        // write indices of deleted props
        const bKeys = Object.keys(base);
        for (let i = 0; i < bKeys.length; ++i) {
            const key = bKeys[i];
            if (!(key in target)) {
                ++numDel;
                out.grow(5 + 4 * key.length);
                out.writeString(key);
            }
        }

        const tKeys = Object.keys(target);
        const schema = this.muData;
        const newKeys:string[] = [];

        // write index-patch pairs
        for (let i = 0; i < tKeys.length; ++i) {
            const key = tKeys[i];
            if (key in base) {
                const prefix = out.offset;
                out.grow(5 + 4 * key.length);
                out.writeString(key);
                if (schema.diff(base[key], target[key], out)) {
                    ++numPatch;
                } else {
                    out.offset = prefix;
                }
            } else {
                newKeys.push(key);
            }
        }

        numAdd = newKeys.length;

        // write new key-value pairs
        const numTrackers = Math.ceil(numAdd / 8);
        out.grow(numTrackers);
        let trackerOffset = out.offset;
        out.offset += numTrackers;

        let tracker = 0;
        for (let i = 0; i < numAdd; ++i) {
            const key = newKeys[i];
            out.grow(5 + 4 * key.length);
            out.writeString(key);
            if (schema.diff(schema.identity, target[key], out)) {
                tracker |= 1 << (i & 7);
            }
            if ((i & 7) === 7) {
                out.writeUint8At(trackerOffset++, tracker);
                tracker = 0;
            }
        }
        if (numAdd & 7) {
            out.writeUint8At(trackerOffset, tracker);
        }

        if (numDel > 0 || numPatch > 0 || numAdd > 0) {
            out.writeUint32At(head, numDel);
            out.writeUint32At(head + 4, numPatch);
            out.writeUint32At(head + 8, numAdd);
            return true;
        }
        out.offset = head;
        return false;
    }

    public patch (
        base:Dictionary<ValueSchema>,
        inp:MuReadStream,
    ) : Dictionary<ValueSchema> {
        let numDel = inp.readUint32();
        const numPatch = inp.readUint32();
        const numAdd = inp.readUint32();

        const bKeys = Object.keys(base);
        const numTargetProps = bKeys.length - numDel + numAdd;
        if (numTargetProps > this.capacity) {
            throw new Error(`number of target props ${numTargetProps} exceeds capacity ${this.capacity}`);
        }

        const result = {};

        // delete
        const deletedKeys = {};
        while (numDel--) {
            deletedKeys[inp.readString()] = true;
        }
        const schema = this.muData;
        for (let i = 0; i < bKeys.length; ++i) {
            const key = bKeys[i];
            if (!deletedKeys[key]) {
                result[key] = schema.clone(base[key]);
            }
        }

        // patch
        for (let i = 0; i < numPatch; ++i) {
            const key = inp.readString();
            result[key] = schema.patch(base[key], inp);
        }

        // add
        const numTrackers = Math.ceil(numAdd / 8);
        const numFullTrackers = numAdd / 8 | 0;
        let trackerOffset = inp.offset;
        inp.offset += numTrackers;
        for (let i = 0; i < numFullTrackers; ++i) {
            const tracker = inp.readUint8At(trackerOffset++);
            for (let j = 0; j < 8; ++j) {
                result[inp.readString()] = tracker & (1 << j) ?
                    schema.patch(schema.identity, inp) :
                    schema.clone(schema.identity);
            }
        }
        if (numAdd & 7) {
            const tracker = inp.readUint8At(trackerOffset);
            for (let i = 0; i < (numAdd & 7); ++i) {
                result[inp.readString()] = tracker & (1 << i) ?
                    schema.patch(schema.identity, inp) :
                    schema.clone(schema.identity);
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
