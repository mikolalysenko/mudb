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

    constructor (valueSchema:ValueSchema, id?:_Dictionary<ValueSchema>) {
        this.identity = id || {};
        this.muData = valueSchema;
        this.json = {
            type: 'dictionary',
            valueType: this.muData.json,
            identity: JSON.stringify(this.identity),
        };
    }

    public alloc () : _Dictionary<ValueSchema> { return {}; }

    public free (x:_Dictionary<ValueSchema>) {
        const valueSchema = this.muData;
        const props = Object.keys(x);
        for (let i = 0; i < props.length; ++i) {
            valueSchema.free(x[props[i]]);
        }
    }

    public equal (x:_Dictionary<ValueSchema>, y:_Dictionary<ValueSchema>) {
        if (x !== Object(x) || y !== Object(y)) {
            return false;
        }

        const xProps = Object.keys(x);
        if (xProps.length !== Object.keys(y).length) {
            return false;
        }

        const hasOwnProperty = Object.prototype.hasOwnProperty;
        for (let i = xProps.length - 1; i >= 0; --i) {
            if (!hasOwnProperty.call(y, xProps[i])) {
                return false;
            }
        }

        for (let i = xProps.length - 1; i >= 0; --i) {
            const prop = xProps[i];
            if (!this.muData.equal(x[prop], y[prop])) {
                return false;
            }
        }

        return true;
    }

    public clone (x:_Dictionary<ValueSchema>) : _Dictionary<ValueSchema> {
        const result = {};
        const props = Object.keys(x);
        const schema = this.muData;
        for (let i = 0; i < props.length; ++i) {
            result[props[i]] = schema.clone(x[props[i]]);
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
        stream:MuWriteStream,
    ) : boolean {
        stream.grow(32);

        let numRemove = 0;
        let numPatch = 0;

        // mark the initial offset
        const removeCounterOffset = stream.offset;
        const patchCounterOffset = removeCounterOffset + 4;
        stream.offset = removeCounterOffset + 8;

        const baseProps = Object.keys(base);
        for (let i = 0; i < baseProps.length; ++i) {
            const prop = baseProps[i];
            if (!(prop in target)) {
                stream.grow(4 + 4 * prop.length);
                stream.writeString(prop);
                ++numRemove;
            }
        }

        const valueSchema = this.muData;
        const targetProps = Object.keys(target);
        for (let i = 0; i < targetProps.length; ++i) {
            const prefixOffset = stream.offset;

            const prop = targetProps[i];
            stream.grow(4 + 4 * prop.length);
            stream.writeString(prop);

            if (prop in base) {
                if (valueSchema.diff(base[prop], target[prop], stream)) {
                    ++numPatch;
                } else {
                    stream.offset = prefixOffset;
                }
            } else {
                if (!valueSchema.diff(valueSchema.identity, target[prop], stream)) {
                    stream.buffer.uint8[prefixOffset + 3] |= 0x80;
                }
                ++numPatch;
            }
        }

        if (numPatch > 0 || numRemove > 0) {
            stream.writeUint32At(removeCounterOffset, numRemove);
            stream.writeUint32At(patchCounterOffset, numPatch);
            return true;
        } else {
            stream.offset = removeCounterOffset;
            return false;
        }
    }

    public patch (
        base:_Dictionary<ValueSchema>,
        stream:MuReadStream,
    ) : _Dictionary<ValueSchema> {
        const result:_Dictionary<ValueSchema> = {};
        const valueSchema = this.muData;

        const numRemove = stream.readUint32();
        const numPatch = stream.readUint32();

        const propsToRemove = {};
        for (let i = 0; i < numRemove; ++i) {
            propsToRemove[stream.readString()] = true;
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
            const isIdentity = stream.buffer.uint8[stream.offset + 3] & 0x80;
            stream.buffer.uint8[stream.offset + 3] &= ~0x80;
            const prop = stream.readString();
            if (prop in base) {
                result[prop] = valueSchema.patch(base[prop], stream);
            } else if (isIdentity) {
                result[prop] = valueSchema.clone(valueSchema.identity);
            } else {
                result[prop] = valueSchema.patch(valueSchema.identity, stream);
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
