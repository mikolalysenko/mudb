import { MuSchema } from './schema';
import { MuWriteStream, MuReadStream } from 'mustreams';

export interface Dictionary<T extends MuSchema<any>> {
    [key:string]:T['identity'];
}

/** Dictionary type schema */
export class MuDictionary<ValueSchema extends MuSchema<any>> implements MuSchema<Dictionary<ValueSchema>> {
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
            identity: JSON.stringify(this.diff({}, this.identity)),
        };
    }

    public alloc () { return {}; }

    public free (x:Dictionary<ValueSchema>) {}

    public clone (x:Dictionary<ValueSchema>) : Dictionary<ValueSchema> {
        const result:Dictionary<ValueSchema> = {};
        const props = Object.keys(x);
        const schema = this.muData;
        for (let i = 0; i < props.length; ++i) {
            result[props[i]] = schema.clone(x[props[i]]);
        }
        return result;
    }

    public diff (base:Dictionary<ValueSchema>, target:Dictionary<ValueSchema>) {
        const remove:string[] = [];
        const patch:{ [prop:string]:any } = {};

        Object.keys(base).forEach((prop) => {
            if (prop in target) {
                const delta = this.muData.diff(base[prop], target[prop]);
                if (delta !== undefined) {
                    patch[prop] = delta;
                }
            } else {
                remove.push(prop);
            }
        });

        Object.keys(target).forEach((prop) => {
            if (!(prop in base)) {
                const d = this.muData.diff(this.muData.identity, target[prop]);
                if (d !== undefined) {
                    patch[prop] = d;
                }
            }
        });

        if (remove.length === 0 && Object.keys(patch).length === 0) {
            return;
        }

        return {
            remove,
            patch,
        };
    }

    public patch (base:Dictionary<ValueSchema>, {remove, patch}:{remove:string[], patch:{[key:string]:any}}) {
        const result = {};
        const schema = this.muData;

        const baseProps = Object.keys(base);
        for (let i = 0; i < baseProps.length; ++i) {
            const prop = baseProps[i];
            if (remove.indexOf(prop) < 0) {
                if (prop in patch) {
                    result[prop] = schema.patch(base[prop], patch[prop]);
                } else {
                    result[prop] = schema.clone(base[prop]);
                }
            }
        }

        const patchProps = Object.keys(patch);
        for (let i = 0; i < patchProps.length; ++i) {
            const prop = patchProps[i];
            if (!(prop in base)) {
                result[prop] = schema.patch(schema.identity, patch[prop]);
            }
        }

        return result;
    }

    public diffBinary (
        base:Dictionary<ValueSchema>,
        target:Dictionary<ValueSchema>,
        stream:MuWriteStream) : boolean {
        const valueSchema = this.muData;

        let numRemove = 0;
        let numPatch = 0;

        const removeOffset = stream.offset;
        stream.grow(4);
        stream.writeUint32(numRemove);
        const patchOffset = stream.offset;
        stream.grow(4);
        stream.writeUint32(numPatch);

        const baseProps = Object.keys(base);
        for (let i = 0; i < baseProps.length; ++i) {
            const prop = baseProps[i];
            if (!(prop in target)) {
                numRemove++;
                stream.grow(4 + 4 * prop.length);
                stream.writeString(prop);
            }
        }

        const targetProps = Object.keys(target);
        for (let i = 0; i < targetProps.length; ++i) {
            const prop = targetProps[i];
            const prefixOffset = stream.offset;
            stream.grow(4 + 4 * prop.length);
            stream.writeString(prop);
            if (prop in base) {
                // FIXME: temporary hack, remove when binary serialization is finished
                if (valueSchema.diffBinary) {
                    const equal = !valueSchema.diffBinary(base[prop], target[prop], stream);
                    if (equal) {
                        stream.offset = prefixOffset;
                    } else {
                        numPatch += 1;
                    }
                }
            } else {
                // FIXME: temporary hack, remove when binary serialization is finished
                if (valueSchema.diffBinary) {
                    const equal = !valueSchema.diffBinary(valueSchema.identity, target[prop], stream);
                    if (equal) {
                        stream.buffer.uint8[prefixOffset + 3] |= 0x80;
                    }
                }
                numPatch += 1;
            }
        }

        stream.writeUint32At(removeOffset, numRemove);
        stream.writeUint32At(patchOffset, numPatch);

        return numPatch > 0 || numRemove > 0;
    }

    public patchBinary(
        base:Dictionary<ValueSchema>,
        stream:MuReadStream) : Dictionary<ValueSchema> {
        const valueSchema = this.muData;
        if (!valueSchema.patchBinary) {
            return this.identity;
        }

        const numRemove = stream.readUint32();
        const numPatch = stream.readUint32();

        const removeProps = {};
        for (let i = 0; i < numRemove; ++i) {
            removeProps[stream.readString()] = true;
        }

        const result:Dictionary<ValueSchema> = {};
        for (const prop in base) {
            if (removeProps[prop]) {
                break;
            }
            result[prop] = valueSchema.clone(base[prop]);
        }

        for (let i = 0; i < numPatch; ++i) {
            const isIdentity = stream.buffer.uint8[stream.offset + 3] & 0x80;
            stream.buffer.uint8[stream.offset + 3] &= ~0x80;
            const prop = stream.readString();
            if (prop in base) {
                result[prop] = valueSchema.patchBinary(base[prop], stream);
            } else if (isIdentity) {
                result[prop] = valueSchema.clone(valueSchema.identity);
            } else {
                result[prop] = valueSchema.patchBinary(valueSchema.identity, stream);
            }
        }

        return result;
    }
}
