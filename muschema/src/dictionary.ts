import { MuSchema } from './schema';
import { MuWriteStream, MuReadStream } from 'mustreams';

/** Dictionary type schema */
export class MuDictionary<ValueSchema extends MuSchema<any>>
        implements MuSchema<{[key:string]:ValueSchema['identity']}> {
    public readonly identity:{[key:string]:ValueSchema['identity']};

    public readonly muType = 'dictionary';
    public readonly muData:ValueSchema;
    public readonly json:object;

    constructor (valueSchema:ValueSchema, id?:{[key:string]:ValueSchema['identity']}) {
        this.identity = id || {};
        this.muData = valueSchema;
        this.json = {
            type: 'dictionary',
            valueType: this.muData.json,
            identity: JSON.stringify(this.diff({}, this.identity)),
        };
    }

    public alloc () { return {}; }

    public free (x:{[key:string]:ValueSchema['identity']}) {}

    public clone (x:{[key:string]:ValueSchema['identity']}) : {[key:string]:ValueSchema['identity']} {
        const result:{[key:string]:ValueSchema['identity']} = {};
        const props = Object.keys(x);
        const schema = this.muData;
        for (let i = 0; i < props.length; ++i) {
            result[props[i]] = schema.clone(x[props[i]]);
        }
        return result;
    }

    public diff (base:{[key:string]:ValueSchema['identity']}, target:{[key:string]:ValueSchema['identity']}) {
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

    public patch (base:{[key:string]:ValueSchema['identity']}, {remove, patch}:{remove:string[], patch:{[key:string]:any}}) {
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
        base:{[key:string]:ValueSchema['identity']},
        target:{[key:string]:ValueSchema['identity']},
        stream:MuWriteStream) : boolean {
        const valueSchema = this.muData;

        const removeOffset = stream.offset;
        stream.writeUint32(0);
        const patchOffset = stream.offset;
        stream.writeUint32(0);

        let numDelete = 0;
        const baseProps = Object.keys(base);
        for (let i = 0; i < baseProps.length; ++i) {
            const prop = baseProps[i];
            if (!(prop in target)) {
                numDelete++;
                stream.grow(4 + 4 * prop.length);
                stream.writeString(prop);
            }
        }

        let numPatch = 0;
        const targetProps = Object.keys(target);
        for (let i = 0; i < targetProps.length; ++i) {
            const prop = targetProps[i];
            if (prop in target) {
                const prefixOffset = stream.offset;
                stream.writeString(prop);
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
                const prefixOffset = stream.offset;
                stream.writeString(prop);
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

        // FIXME: set patch count and remove count using offset
        // should use data view api

        return numPatch > 0 || numDelete > 0;
    }

    public patchBinary(
        base:{[key:string]:ValueSchema['identity']},
        stream:MuReadStream) : {[key:string]:ValueSchema['identity']} {
        const valueSchema = this.muData;
        if (!valueSchema.patchBinary) {
            return this.identity;
        }

        const numDelete = stream.readUint32();
        const numPatch = stream.readUint32();

        const removeProps = {};
        for (let i = 0; i < numDelete; ++i) {
            removeProps[stream.readString()] = true;
        }

        const result:{[key:string]:ValueSchema['identity']} = {};
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
