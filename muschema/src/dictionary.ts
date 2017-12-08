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
            identity: JSON.stringify(this.diff({}, this.identity)),
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
        stream:MuWriteStream,
    ) : boolean {
        const valueSchema = this.muData;

        let numDelete = 0;
        let numPatch = 0;

        function calcByteLength (strs) {
            let result = 0;
            for (const s of strs) {
                result += 4 + 4 * s.length;
            }
            return result;
        }

        const baseProps = Object.keys(base);
        const targetProps = Object.keys(target);
        stream.grow(8 + calcByteLength(baseProps) + calcByteLength(targetProps));

        const deleteOffset = stream.offset;
        stream.writeUint32(numDelete);
        const patchOffset = stream.offset;
        stream.writeUint32(numPatch);

        for (let i = 0; i < baseProps.length; ++i) {
            const prop = baseProps[i];
            if (!(prop in target)) {
                stream.writeString(prop);
                ++numDelete;
            }
        }

        for (let i = 0; i < targetProps.length; ++i) {
            const prop = targetProps[i];
            const prefixOffset = stream.offset;
            stream.writeString(prop);
            if (prop in base) {
                const different = valueSchema.diffBinary!(base[prop], target[prop], stream);
                if (different) {
                    ++numPatch;
                } else {
                    stream.offset = prefixOffset;
                }
            } else {
                const equal = !valueSchema.diffBinary!(valueSchema.identity, target[prop], stream);
                if (equal) {
                    stream.buffer.uint8[prefixOffset + 3] |= 0x80;
                }
                ++numPatch;
            }
        }

        stream.writeUint32At(deleteOffset, numDelete);
        stream.writeUint32At(patchOffset, numPatch);

        return numPatch > 0 || numDelete > 0;
    }

    public patchBinary (
        base:Dictionary<ValueSchema>,
        stream:MuReadStream,
    ) : Dictionary<ValueSchema> {
        const valueSchema = this.muData;
        const numDelete = stream.readUint32();
        const numPatch = stream.readUint32();

        const propsToDelete = {};
        for (let i = 0; i < numDelete; ++i) {
            propsToDelete[stream.readString()] = true;
        }

        const result:Dictionary<ValueSchema> = {};
        for (const prop in base) {
            if (propsToDelete[prop]) {
                break;
            }
            result[prop] = valueSchema.clone(base[prop]);
        }

        for (let i = 0; i < numPatch; ++i) {
            const isIdentity = stream.buffer.uint8[stream.offset + 3] & 0x80;
            stream.buffer.uint8[stream.offset + 3] &= ~0x80;
            const prop = stream.readString();
            if (prop in base) {
                result[prop] = valueSchema.patchBinary!(base[prop], stream);
            } else if (isIdentity) {
                result[prop] = valueSchema.clone(valueSchema.identity);
            } else {
                result[prop] = valueSchema.patchBinary!(valueSchema.identity, stream);
            }
        }

        return result;
    }

    public getByteLength (x:Dictionary<ValueSchema>) : number {
        const valueSchema = this.muData;
        const numProps = Object.keys(x).length;
        switch (valueSchema.muType) {
            case 'boolean':
            case 'int8':
            case 'uint8':
                return numProps;
            case 'int16':
            case 'uint16':
                return numProps * 2;
            case 'float32':
            case 'int32':
            case 'uint32':
                return numProps * 4;
            case 'float64':
                return numProps * 8;
            default:
                let result = 0;
                for (const key in x) {
                    result += valueSchema.getByteLength!(x[key]);
                }
                return result;
        }
    }
}
