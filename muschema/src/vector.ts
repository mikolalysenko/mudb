import { MuSchema } from './schema';
import { MuNumber } from './_number';
import {
    MuReadStream,
    MuWriteStream,
} from 'mustreams';

const muTypeToTypedArray = {
    float32: Float32Array,
    float64: Float64Array,
    int8: Int8Array,
    int16: Int16Array,
    int32: Int32Array,
    uint8: Uint8Array,
    uint16: Uint16Array,
    uint32: Uint32Array,
};

export type _MuVectorType<ValueSchema extends MuNumber> = {
    float32:Float32Array;
    float64:Float64Array;
    int8:Int8Array;
    int16:Int16Array;
    int32:Int32Array;
    uint8:Uint8Array;
    uint16:Uint16Array;
    uint32:Uint32Array;
}[ValueSchema['muType']];

export class MuVector<ValueSchema extends MuNumber> implements MuSchema<_MuVectorType<ValueSchema>> {
    private _constructor:typeof muTypeToTypedArray[ValueSchema['muType']];
    private _pool:_MuVectorType<ValueSchema>[] = [];

    public readonly identity:_MuVectorType<ValueSchema>;
    public readonly muType = 'vector';
    public readonly muData:ValueSchema;
    public readonly json:object;

    public readonly dimension:number;

    constructor (valueSchema:ValueSchema, dimension:number) {
        this._constructor = muTypeToTypedArray[valueSchema.muType];

        this.identity = new this._constructor(dimension);
        for (let i = 0; i < dimension; ++i) {
            this.identity[i] = valueSchema.identity;
        }

        this.muData = valueSchema;
        this.json = {
            type: 'vector',
            valueType: this.muData.json,
            dimension,
        };
        this.dimension = dimension;
    }

    public alloc () : _MuVectorType<ValueSchema> {
        return this._pool.pop() || new this._constructor(this.dimension);
    }

    public free (vec) {
        this._pool.push(vec);
    }

    public clone (vec) : _MuVectorType<ValueSchema> {
        const copy = this.alloc();
        copy.set(vec);
        return copy;
    }

    // TODO remove diff and patch
    public diff () {}
    public patch () { return new Uint8Array(0); }

    public diffBinary (base:_MuVectorType<ValueSchema>, target:_MuVectorType<ValueSchema>, stream:MuWriteStream) {
        const dimension = this.dimension;
        const valueSchema:MuSchema<number> = this.muData;

        let numPatch = 0;
        stream.grow(4);
        stream.writeUint32(numPatch);

        for (let i = 0; i < dimension; ++i) {
            const prefixOffset = stream.offset;

            stream.grow(4);
            stream.writeUint32(i);

            const different = valueSchema.diffBinary!(base[i], target[i], stream);
            if (different) {
                numPatch++;
            } else {
                stream.offset = prefixOffset;
            }
        }
        stream.writeUint32At(0, numPatch);

        return numPatch > 0;
    }

    public patchBinary (base:_MuVectorType<ValueSchema>, stream:MuReadStream) {
        const result = this.clone(base);

        const numPatch = stream.readUint32();
        const valueSchema:MuSchema<number> = this.muData;
        for (let i = 0; i < numPatch; ++i) {
            const index = stream.readUint32();
            result[index] = valueSchema.patchBinary!(base[index], stream);
        }

        return result;
    }
}
