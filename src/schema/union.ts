import { MuWriteStream, MuReadStream } from '../stream';

import { MuSchema } from './schema';

export type _Union<SubTypes extends { [type:string]:MuSchema<any> }> = {
    type:keyof SubTypes;
    data:SubTypes[keyof SubTypes]['identity'];
};

export type _UnionJSON<SubTypes extends { [type:string]:MuSchema<any> }> = {
    type:keyof SubTypes;
    data:any;
};

function isUnion (x) {
    if (x !== Object(x)) {
        return false;
    }
    if (Object.keys(x).length !== 2) {
        return false;
    }

    const hasOwnProperty = Object.prototype.hasOwnProperty;
    if (!hasOwnProperty.call(x, 'type')) {
        return false;
    }
    if (!hasOwnProperty.call(x, 'data')) {
        return false;
    }

    return true;
}

export class MuUnion<SubTypes extends { [type:string]:MuSchema<any> }>
        implements MuSchema<_Union<SubTypes>> {
    private _types:string[];

    public readonly identity:_Union<SubTypes>;

    public readonly muType = 'union';
    public readonly muData:SubTypes;
    public readonly json:object;

    constructor (
        schemaSpec:SubTypes,
        identityType?:keyof SubTypes,
    ) {
        this._types = Object.keys(schemaSpec);
        this.muData = schemaSpec;

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

    public alloc () : _Union<SubTypes> {
        const type = this.identity.type;
        return {
            type,
            data: type ? this.muData[type].clone(this.identity.data) : void 0,
        };
    }

    public free (union:_Union<SubTypes>) {
        this.muData[union.type].free(union.data);
    }

    public equal (a:_Union<SubTypes>, b:_Union<SubTypes>) {
        if (!isUnion(a) || !isUnion(b)) {
            return false;
        }
        if (a.type !== b.type) {
            return false;
        }
        if (a.type === '') {
            return true;
        }
        return this.muData[a.type].equal(a.data, b.data);
    }

    public clone (union:_Union<SubTypes>) : _Union<SubTypes> {
        const schema = this.muData[union.type];
        return {
            type: union.type,
            data: schema.clone(union.data),
        };
    }

    public copy (source:_Union<SubTypes>, target:_Union<SubTypes>) {
        if (source === target) {
            return;
        }

        if (source.type === target.type) {
            this.muData[source.type].copy(source.data, target.data);
        }

        target.type = source.type;
        this.muData[target.type].free(target.data);
        target.data = this.muData[source.type].clone(source.data);
    }

    public diff (
        base:_Union<SubTypes>,
        target:_Union<SubTypes>,
        out:MuWriteStream,
    ) : boolean {
        out.grow(8);

        const trackerOffset = out.offset;
        ++out.offset;

        let tracker = 0;

        const dataSchema = this.muData[target.type];
        if (base.type === target.type) {
            if (dataSchema.diff(base.data, target.data, out)) {
                tracker = 1;
            }
        } else {
            out.writeUint8(this._types.indexOf(target.type as string));
            if (dataSchema.diff(dataSchema.identity, target.data, out)) {
                tracker = 2;
            } else {
                tracker = 4;
            }
        }

        if (tracker) {
            out.writeUint8At(trackerOffset, tracker);
            return true;
        }
        out.offset = trackerOffset;
        return false;
    }

    public patch (
        base:_Union<SubTypes>,
        inp:MuReadStream,
    ) : _Union<SubTypes> {
        const result = this.clone(base);

        const tracker = inp.readUint8();
        if (tracker & 1) {
            result.data = this.muData[result.type].patch(result.data, inp);
        } else if (tracker & 2) {
            result.type = this._types[inp.readUint8()];
            const schema = this.muData[result.type];
            result.data = schema.patch(result.data, inp);
        } else {
            result.type = this._types[inp.readUint8()];
            const schema = this.muData[result.type];
            result.data = schema.clone(schema.identity);
        }

        return result;
    }

    public toJSON (union:_Union<SubTypes>) : _UnionJSON<SubTypes> {
        return {
            type: union.type,
            data: this.muData[union.type].toJSON(union.data),
        };
    }

    public fromJSON (json:_UnionJSON<SubTypes>) : _Union<SubTypes> {
        return {
            type: json.type,
            data: this.muData[json.type].fromJSON(json.data),
        };
    }
}
