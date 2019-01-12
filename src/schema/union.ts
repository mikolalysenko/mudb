import { MuWriteStream, MuReadStream } from '../stream';

import { MuSchema } from './schema';
import { isMuPrimitiveType } from './type';

export interface Union<SubTypes extends { [type:string]:MuSchema<any> }> {
    type:keyof SubTypes;
    data:SubTypes[keyof SubTypes]['identity'];
}

export interface UnionJSON<SubTypes extends { [type:string]:MuSchema<any> }> {
    type:keyof SubTypes;
    data:any;
}

export class MuUnion<SubTypes extends { [type:string]:MuSchema<any> }>
        implements MuSchema<Union<SubTypes>> {
    public readonly muType = 'union';

    public readonly identity:Union<SubTypes>;
    public readonly muData:SubTypes;
    public readonly json:object;
    private _types:(keyof SubTypes)[];

    constructor (
        schemaSpec:SubTypes,
        identityType?:keyof SubTypes,
    ) {
        this.muData = schemaSpec;
        this._types = Object.keys(schemaSpec).sort();

        if (identityType) {
            this.identity = {
                type: identityType,
                data: schemaSpec[identityType].identity,
            };
        } else {
            this.identity = {
                type: '',
                data: void 0,
            };
        }

        const result = {};
        Object.keys(schemaSpec).forEach((subtype) => {
            result[subtype] = this.muData[subtype].json;
        });
        this.json = {
            type: 'union',
            identity: this.identity.type,
            data: result,
        };
    }

    public alloc () : Union<SubTypes> {
        const type = this.identity.type;
        return {
            type,
            data: type ? this.muData[type].clone(this.identity.data) : void 0,
        };
    }

    public free (union:Union<SubTypes>) {
        this.muData[union.type].free(union.data);
    }

    public equal (a:Union<SubTypes>, b:Union<SubTypes>) {
        if (a.type !== b.type) {
            return false;
        }
        if (a.type === '') {
            return true;
        }
        return this.muData[a.type].equal(a.data, b.data);
    }

    public clone (union:Union<SubTypes>) : Union<SubTypes> {
        const type = union.type;
        return {
            type,
            data: type ? this.muData[type].clone(union.data) : void 0,
        };
    }

    public assign (dst:Union<SubTypes>, src:Union<SubTypes>) {
        if (dst === src) {
            return;
        }

        const dType = dst.type;
        const sType = src.type;
        const valueSchema = this.muData;

        dst.type = src.type;

        if (dst.type !== dType) {
            valueSchema[dType] && valueSchema[dType].free(dst.data);
            if (sType) {
                valueSchema[sType] && (dst.data = valueSchema[sType].clone(src.data));
            } else {
                dst.data = void 0;
            }
            return;
        }

        // same type
        if (valueSchema[dType]) {
            valueSchema[dType].assign(dst.data, src.data);
            if (isMuPrimitiveType(valueSchema[dType].muType)) {
                dst.data = src.data;
            }
        }
    }

    public diff (
        base:Union<SubTypes>,
        target:Union<SubTypes>,
        out:MuWriteStream,
    ) : boolean {
        out.grow(8);

        const head = out.offset;
        ++out.offset;

        let opCode = 0;
        const dataSchema = this.muData[target.type];
        if (base.type === target.type) {
            if (dataSchema.diff(base.data, target.data, out)) {
                opCode = 1;
            }
        } else {
            out.writeUint8(this._types.indexOf(target.type as string));
            if (dataSchema.diff(dataSchema.identity, target.data, out)) {
                opCode = 2;
            } else {
                opCode = 4;
            }
        }

        if (opCode) {
            out.writeUint8At(head, opCode);
            return true;
        }
        out.offset = head;
        return false;
    }

    public patch (
        base:Union<SubTypes>,
        inp:MuReadStream,
    ) : Union<SubTypes> {
        const result = this.clone(base);

        const opCode = inp.readUint8();
        if (opCode & 1) {
            result.data = this.muData[result.type].patch(result.data, inp);
        } else {
            result.type = this._types[inp.readUint8()];
            const schema = this.muData[result.type];
            if (opCode & 2) {
                result.data = schema.patch(schema.identity, inp);
            } else if (opCode & 4) {
                result.data = schema.clone(schema.identity);
            }
        }

        return result;
    }

    public toJSON (union:Union<SubTypes>) : UnionJSON<SubTypes> {
        return {
            type: union.type,
            data: this.muData[union.type].toJSON(union.data),
        };
    }

    public fromJSON (json:UnionJSON<SubTypes>) : Union<SubTypes> {
        return {
            type: json.type,
            data: this.muData[json.type].fromJSON(json.data),
        };
    }
}
