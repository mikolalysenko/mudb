import { MuSchema } from './schema';
import { MuWriteStream, MuReadStream } from 'mustreams';

export type Dictionary<V extends MuSchema<any>> = {
    [key:string]:V['identity'];
};

export class MuDictionary<ValueSchema extends MuSchema<any>>
        implements MuSchema<Dictionary<ValueSchema>> {
    public readonly identity:Dictionary<ValueSchema>;
    public readonly muType = 'dictionary';
    public readonly muData:ValueSchema;
    public readonly json:object;

    constructor (valueSchema:ValueSchema, id?:Dictionary<ValueSchema>) {
        this.identity = id || {};
        this.muData = valueSchema;
        this.json = {
            type: 'dictionary',
            valueType: this.muData.json,
            identity: JSON.stringify(this.identity),
        };
    }

    public alloc () : Dictionary<ValueSchema> { return {}; }

    public free (x:Dictionary<ValueSchema>) {
        const valueSchema = this.muData;
        switch (valueSchema.muType) {
            case 'boolean':
            case 'float32':
            case 'float64':
            case 'int8':
            case 'int16':
            case 'int32':
            case 'string':
            case 'uint8':
            case 'uint16':
            case 'uint32':
                break;
            default:
                for (const prop in x) {
                    valueSchema.free(x[prop]);
                }
        }
    }

    public clone (x:Dictionary<ValueSchema>) : Dictionary<ValueSchema> {
        const result:Dictionary<ValueSchema> = {};
        const props = Object.keys(x);
        const schema = this.muData;
        for (let i = 0; i < props.length; ++i) {
            result[props[i]] = schema.clone(x[props[i]]);
        }
        return result;
    }

    // a word reserved for number of properties removed +
    // a word reserved for number of patches +
    // bytes for property names +
    // bytes for values
    public calcByteLength (x:Dictionary<ValueSchema>) : number {
        function calcStrsByteLength (strs:string[]) {
            let r = 0;
            for (const s of strs) {
                r += 4 + 4 * s.length;
            }
            return r;
        }

        let result = 8;

        const props = Object.keys(x);
        result += calcStrsByteLength(props);

        const valueSchema = this.muData;
        const numProps = props.length;
        switch (valueSchema.muType) {
            case 'boolean':
            case 'int8':
            case 'uint8':
                result += numProps;
                break;
            case 'int16':
            case 'uint16':
                result += numProps * 2;
                break;
            case 'float32':
            case 'int32':
            case 'uint32':
                result += numProps * 4;
                break;
            case 'float64':
                result += numProps * 8;
                break;
            case 'string':
                const values = props.map((p) => x[p]);
                result += calcStrsByteLength(values);
                break;
            default:
                for (const key in x) {
                    result += valueSchema.calcByteLength!(x[key]);
                }
        }

        return result;
    }

    public diff (
        base:Dictionary<ValueSchema>,
        target:Dictionary<ValueSchema>,
        stream:MuWriteStream,
    ) : boolean {
        stream.grow(this.calcByteLength(base) + this.calcByteLength(target));

        let numRemove = 0;
        let numPatch = 0;

        const removeCounterOffset = stream.offset;
        const patchCounterOffset = removeCounterOffset + 4;
        stream.offset = removeCounterOffset + 8;

        const baseProps = Object.keys(base);
        for (let i = 0; i < baseProps.length; ++i) {
            const prop = baseProps[i];
            if (!(prop in target)) {
                stream.writeString(prop);
                ++numRemove;
            }
        }

        const valueSchema = this.muData;
        const targetProps = Object.keys(target);
        for (let i = 0; i < targetProps.length; ++i) {
            const prefixOffset = stream.offset;

            const prop = targetProps[i];
            stream.writeString(prop);

            if (prop in base) {
                const different = valueSchema.diff(base[prop], target[prop], stream);
                if (different) {
                    ++numPatch;
                } else {
                    stream.offset = prefixOffset;
                }
            } else {
                const equalToIdentity = !valueSchema.diff(valueSchema.identity, target[prop], stream);
                if (equalToIdentity) {
                    // mask the most significant bit of the word
                    // recording the length of the property name
                    stream.buffer.uint8[prefixOffset + 3] |= 0x80;

                    if (valueSchema.muType === 'dictionary') {
                        stream.offset -= 8;
                    }
                }
                ++numPatch;
            }
        }

        stream.writeUint32At(removeCounterOffset, numRemove);
        stream.writeUint32At(patchCounterOffset, numPatch);

        return numPatch > 0 || numRemove > 0;
    }

    public patch (
        base:Dictionary<ValueSchema>,
        stream:MuReadStream,
    ) : Dictionary<ValueSchema> {
        const result:Dictionary<ValueSchema> = {};

        const numRemove = stream.readUint32();
        const numPatch = stream.readUint32();

        const propsToRemove = {};
        for (let i = 0; i < numRemove; ++i) {
            propsToRemove[stream.readString()] = true;
        }

        const valueSchema = this.muData;
        for (const prop in base) {
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
}
