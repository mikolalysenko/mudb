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
            result[subtype] = schemaSpec[subtype].json;
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

    public free (union:Union<SubTypes>) : void {
        this.muData[union.type].free(union.data);
    }

    public equal (a:Union<SubTypes>, b:Union<SubTypes>) : boolean {
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

    public assign (dst:Union<SubTypes>, src:Union<SubTypes>) : Union<SubTypes> {
        const dType = dst.type;
        const sType = src.type;
        const schema = this.muData;

        dst.type = src.type;

        if (dst.type !== dType) {
            schema[dType] && schema[dType].free(dst.data);
            if (sType) {
                schema[sType] && (dst.data = schema[sType].clone(src.data));
            } else {
                dst.data = void 0;
            }
            return dst;
        }

        // same type
        if (schema[dType]) {
            schema[dType].assign(dst.data, src.data);
            if (isMuPrimitiveType(schema[dType].muType)) {
                dst.data = src.data;
            }
        }
        return dst;
    }

    public diff (
        base:Union<SubTypes>,
        target:Union<SubTypes>,
        out:MuWriteStream,
    ) : boolean {
        out.grow(8);

        const head = out.offset;
        ++out.offset;

        let opcode = 0;
        const schema = this.muData[target.type];
        if (base.type === target.type) {
            if (schema.diff(base.data, target.data, out)) {
                opcode = 1;
            }
        } else {
            out.writeUint8(this._types.indexOf(target.type as string));
            if (schema.diff(schema.identity, target.data, out)) {
                opcode = 2;
            } else {
                opcode = 4;
            }
        }

        if (opcode) {
            out.writeUint8At(head, opcode);
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
        const opcode = inp.readUint8();
        if (opcode === 1) {
            result.data = this.muData[result.type].patch(result.data, inp);
        } else {
            result.type = this._types[inp.readUint8()];
            const schema = this.muData[result.type];
            if (opcode === 2) {
                result.data = schema.patch(schema.identity, inp);
            } else if (opcode === 4) {
                result.data = schema.clone(schema.identity);
            } else {
                throw new Error(`invalid opcode ${opcode}`);
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
