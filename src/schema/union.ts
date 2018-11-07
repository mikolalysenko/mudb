import { MuWriteStream, MuReadStream } from '../stream';

import { MuSchema } from './schema';

// tslint:disable-next-line:class-name
export interface _TypeDataPair<SubTypes extends { [type:string]:MuSchema<any> }> {
    type:keyof SubTypes;
    data:SubTypes[keyof SubTypes]['identity'];
}

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
        implements MuSchema<_TypeDataPair<SubTypes>> {
    private _types:string[];

    public readonly identity:_TypeDataPair<SubTypes>;

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

    public alloc () : _TypeDataPair<SubTypes> {
        return {
            type: '',
            data: void 0,
        };
    }

    public free (data:_TypeDataPair<SubTypes>) {
        this.muData[data.type].free(data.data);
    }

    public equal (x:_TypeDataPair<SubTypes>, y:_TypeDataPair<SubTypes>) {
        if (!isUnion(x) || !isUnion(y)) {
            return false;
        }
        if (x.type !== y.type) {
            return false;
        }
        if (x.type === '') {
            return true;
        }
        return this.muData[x.type].equal(x.data, y.data);
    }

    public clone (data:_TypeDataPair<SubTypes>) : _TypeDataPair<SubTypes> {
        const schema = this.muData[data.type];
        return {
            type: data.type,
            data: schema.clone(data.data),
        };
    }

    public copy (source:_TypeDataPair<SubTypes>, target:_TypeDataPair<SubTypes>) {
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
        base:_TypeDataPair<SubTypes>,
        target:_TypeDataPair<SubTypes>,
        stream:MuWriteStream,
    ) : boolean {
        stream.grow(8);

        const trackerOffset = stream.offset;
        ++stream.offset;

        let tracker = 0;

        const dataSchema = this.muData[target.type];
        if (base.type === target.type) {
            if (dataSchema.diff(base.data, target.data, stream)) {
                tracker = 1;
            }
        } else {
            stream.writeUint8(this._types.indexOf(target.type as string));
            if (dataSchema.diff(dataSchema.identity, target.data, stream)) {
                tracker = 2;
            } else {
                tracker = 4;
            }
        }

        if (tracker) {
            stream.writeUint8At(trackerOffset, tracker);
            return true;
        }
        stream.offset = trackerOffset;
        return false;
    }

    public patch (
        base:_TypeDataPair<SubTypes>,
        stream:MuReadStream,
    ) : _TypeDataPair<SubTypes> {
        const result = this.clone(base);

        const tracker = stream.readUint8();
        if (tracker & 1) {
            result.data = this.muData[result.type].patch(result.data, stream);
        } else if (tracker & 2) {
            result.type = this._types[stream.readUint8()];
            const schema = this.muData[result.type];
            result.data = schema.patch(result.data, stream);
        } else {
            result.type = this._types[stream.readUint8()];
            const schema = this.muData[result.type];
            result.data = schema.clone(schema.identity);
        }

        return result;
    }
}
