import { MuWriteStream, MuReadStream } from '../stream';

import { MuSchema } from './schema';
import { isMuPrimitive } from './util/type';

export type _Dictionary<V extends MuSchema<any>> = {
    [key:string]:V['identity'];
};

export class MuDictionary<ValueSchema extends MuSchema<any>>
        implements MuSchema<_Dictionary<ValueSchema>> {
    public readonly identity:_Dictionary<ValueSchema>;
    public readonly muType = 'dictionary';
    public readonly muData:ValueSchema;
    public readonly json:object;

    constructor (valueSchema:ValueSchema, identity?:_Dictionary<ValueSchema>) {
        this.identity = identity || {};
        this.muData = valueSchema;
        this.json = {
            type: 'dictionary',
            valueType: this.muData.json,
            identity: JSON.stringify(this.identity),
        };
    }

    public alloc () : _Dictionary<ValueSchema> { return {}; }

    public free (dict:_Dictionary<ValueSchema>) {
        const valueSchema = this.muData;
        const props = Object.keys(dict);
        for (let i = 0; i < props.length; ++i) {
            valueSchema.free(dict[props[i]]);
        }
    }

    public equal (a:_Dictionary<ValueSchema>, b:_Dictionary<ValueSchema>) {
        if (a !== Object(a) || b !== Object(b)) {
            return false;
        }

        const aProps = Object.keys(a);
        if (aProps.length !== Object.keys(b).length) {
            return false;
        }

        const hasOwnProperty = Object.prototype.hasOwnProperty;
        for (let i = aProps.length - 1; i >= 0; --i) {
            if (!hasOwnProperty.call(b, aProps[i])) {
                return false;
            }
        }

        for (let i = aProps.length - 1; i >= 0; --i) {
            const prop = aProps[i];
            if (!this.muData.equal(a[prop], b[prop])) {
                return false;
            }
        }

        return true;
    }

    public clone (dict:_Dictionary<ValueSchema>) : _Dictionary<ValueSchema> {
        const result = {};
        const props = Object.keys(dict);
        const schema = this.muData;
        for (let i = 0; i < props.length; ++i) {
            result[props[i]] = schema.clone(dict[props[i]]);
        }
        return result;
    }

    public copy (source:_Dictionary<ValueSchema>, target:_Dictionary<ValueSchema>) {
        if (source === target) {
            return;
        }

        const sourceProps = Object.keys(source);
        const targetProps = Object.keys(target);

        const hasOwnProperty = Object.prototype.hasOwnProperty;

        for (let i = 0; i < targetProps.length; ++i) {
            const prop = targetProps[i];
            if (!hasOwnProperty.call(source, prop)) {
                this.muData.free(target[prop]);
                delete target[prop];
            }
        }

        if (isMuPrimitive(this.muData.muType)) {
            for (let i = 0; i < sourceProps.length; ++i) {
                const prop = sourceProps[i];
                target[prop] = source[prop];
            }
            return;
        }

        for (let i = 0; i < sourceProps.length; ++i) {
            const prop = sourceProps[i];
            if (!hasOwnProperty.call(target, prop)) {
                target[prop] = this.muData.clone(source[prop]);
            } else {
                this.muData.copy(source[prop], target[prop]);
            }
        }
    }

    public diff (
        base:_Dictionary<ValueSchema>,
        target:_Dictionary<ValueSchema>,
        out:MuWriteStream,
    ) : boolean {
        out.grow(32);

        let numRemove = 0;
        let numPatch = 0;

        // mark the initial offset
        const removeCounterOffset = out.offset;
        const patchCounterOffset = removeCounterOffset + 4;
        out.offset = removeCounterOffset + 8;

        const baseProps = Object.keys(base);
        for (let i = 0; i < baseProps.length; ++i) {
            const prop = baseProps[i];
            if (!(prop in target)) {
                out.grow(4 + 4 * prop.length);
                out.writeString(prop);
                ++numRemove;
            }
        }

        const valueSchema = this.muData;
        const targetProps = Object.keys(target);
        for (let i = 0; i < targetProps.length; ++i) {
            const prefixOffset = out.offset;

            const prop = targetProps[i];
            out.grow(4 + 4 * prop.length);
            out.writeString(prop);

            if (prop in base) {
                if (valueSchema.diff(base[prop], target[prop], out)) {
                    ++numPatch;
                } else {
                    out.offset = prefixOffset;
                }
            } else {
                if (!valueSchema.diff(valueSchema.identity, target[prop], out)) {
                    out.buffer.uint8[prefixOffset + 3] |= 0x80;
                }
                ++numPatch;
            }
        }

        if (numPatch > 0 || numRemove > 0) {
            out.writeUint32At(removeCounterOffset, numRemove);
            out.writeUint32At(patchCounterOffset, numPatch);
            return true;
        } else {
            out.offset = removeCounterOffset;
            return false;
        }
    }

    public patch (
        base:_Dictionary<ValueSchema>,
        inp:MuReadStream,
    ) : _Dictionary<ValueSchema> {
        const result:_Dictionary<ValueSchema> = {};
        const valueSchema = this.muData;

        const numRemove = inp.readUint32();
        const numPatch = inp.readUint32();

        const propsToRemove = {};
        for (let i = 0; i < numRemove; ++i) {
            propsToRemove[inp.readString()] = true;
        }

        const props = Object.keys(base);
        for (let i = 0; i < props.length; ++i) {
            const prop = props[i];
            if (propsToRemove[prop]) {
                continue;
            }
            result[prop] = valueSchema.clone(base[prop]);
        }

        for (let i = 0; i < numPatch; ++i) {
            const isIdentity = inp.buffer.uint8[inp.offset + 3] & 0x80;
            inp.buffer.uint8[inp.offset + 3] &= ~0x80;
            const prop = inp.readString();
            if (prop in base) {
                result[prop] = valueSchema.patch(base[prop], inp);
            } else if (isIdentity) {
                result[prop] = valueSchema.clone(valueSchema.identity);
            } else {
                result[prop] = valueSchema.patch(valueSchema.identity, inp);
            }
        }

        return result;
    }

    public toJSON (dict:_Dictionary<ValueSchema>) : _Dictionary<any> {
        const json = {};
        const keys = Object.keys(dict);

        const valueSchema = this.muData;
        for (let i = 0; i < keys.length; ++i) {
            const k = keys[i];
            json[k] = valueSchema.toJSON(dict[k]);
        }
        return json;
    }

    public fromJSON (json:_Dictionary<any>) : _Dictionary<ValueSchema> {
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
