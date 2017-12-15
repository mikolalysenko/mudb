import { MuSchema } from './schema';
import { MuWriteStream, MuReadStream } from 'mustreams';

// tslint:disable-next-line:class-name
export interface _TypeDataPair<SubTypes extends { [type:string]:MuSchema<any> }> {
    type:keyof SubTypes;
    data:SubTypes[keyof SubTypes]['identity'];
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

    public clone (data:_TypeDataPair<SubTypes>) : _TypeDataPair<SubTypes> {
        const schema = this.muData[data.type];
        return {
            type: data.type,
            data: schema.clone(data.data),
        };
    }

    public diffBinary (
        base:_TypeDataPair<SubTypes>,
        target:_TypeDataPair<SubTypes>,
        stream:MuWriteStream,
    ) : boolean {
        stream.grow(this.getByteLength(target));

        const trackerOffset = stream.offset;
        stream.offset = trackerOffset + 1;

        let tracker = 0;

        const schema = this.muData[target.type];
        if (base.type === target.type) {
            if (schema.diffBinary!(base.data, target.data, stream)) {
                tracker = 1;
            }
        } else {
            stream.writeUint8(this._types.indexOf(target.type));
            schema.diffBinary!(schema.identity, target.data, stream);
            tracker = 2;
        }

        if (tracker) {
            stream.writeUint8At(trackerOffset, tracker);
            return true;
        }
        stream.offset = trackerOffset;
        return false;
    }

    public patchBinary (
        base:_TypeDataPair<SubTypes>,
        stream:MuReadStream,
    ) : _TypeDataPair<SubTypes> {
        const result = this.clone(base);
        const tracker = stream.readUint8();

        if (tracker === 1) {
            const schema = this.muData[result.type];
            result.data = schema.patchBinary!(result.data, stream);
        }

        if (tracker === 2) {
            result.type = this._types[stream.readUint8()];

            const schema = this.muData[result.type];
            result.data = schema.patchBinary!(schema.identity, stream);
        }

        return result;
    }

    public getByteLength (data:_TypeDataPair<SubTypes>) : number {
        const TRACKER_BYTE = 1;
        let result = TRACKER_BYTE;

        const type = data.type;

        result += 4 + type.length * 4;
        result += this.muData[type].getByteLength!(data.data);

        return result;
    }

    public diff (base:_TypeDataPair<SubTypes>, target:_TypeDataPair<SubTypes>) : (any | undefined) {
        const model = this.muData[target.type];
        if (target.type === base.type) {
            const delta = model.diff(base.data, target.data);
            if (delta === void 0) {
                return;
            }
            return {
                data: delta
            };
        } else {
            return {
                type: target.type,
                data: model.diff(model.identity, target.data),
            };
        }
    }

    public patch (base:_TypeDataPair<SubTypes>, patch:any) : _TypeDataPair<SubTypes> {
        if ('type' in patch) {
            const model = this.muData[patch.type];
            return {
                type: patch.type,
                data: model.patch(model.identity, patch.data),
            };
        } else if ('data' in patch) {
            return {
                type: base.type,
                data: this.muData[base.type].patch(base.data, patch.data),
            };
        } else {
            return {
                type: base.type,
                data: this.muData[base.type].clone(base.data),
            };
        }
    }
}
