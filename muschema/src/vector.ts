import { MuSchema } from './schema';
import { MuNumber } from './_number';
import {
    MuReadStream,
    MuWriteStream,
} from 'mustreams';

const numType2ArrayType = {
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
    private _constructor:typeof numType2ArrayType[ValueSchema['muType']];
    private _pool:_MuVectorType<ValueSchema>[] = [];

    public readonly identity:_MuVectorType<ValueSchema>;
    public readonly muType = 'vector';
    public readonly muData:ValueSchema;
    public readonly json:object;

    public readonly dimension:number;

    constructor (valueSchema:ValueSchema, dimension:number) {
        this._constructor = numType2ArrayType[valueSchema.muType];

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

    public diffBinary (base_:_MuVectorType<ValueSchema>, target_:_MuVectorType<ValueSchema>, stream:MuWriteStream) {
        const valueSchema:MuSchema<number> = this.muData;
        const dimension = this.dimension * this.identity.BYTES_PER_ELEMENT;

        stream.grow(Math.ceil(dimension * 9 / 8));

        const base = new Uint8Array(base_.buffer);
        const target = new Uint8Array(target_.buffer);

        let tracker = 0;
        let numDiff = 0;
        for (let i = 0; i < dimension; ++i) {
            if (base[i] !== target[i]) {
                tracker |= 1 << (i & 7);
                ++numDiff;
            }

            if ((i & 7) === 7) {
                stream.writeUint8(tracker);
                tracker = 0;
            }
        }

        if (dimension & 7) {
            stream.writeUint8(tracker);
        }

        for (let i = 0; i < dimension; ++i) {
            if (base[i] !== target[i]) {
                stream.writeUint8(target[i]);
            }
        }

        return numDiff > 0;
    }

    public patchBinary (base:_MuVectorType<ValueSchema>, stream:MuReadStream) {
        const trackerOffset = stream.offset;
        const trackerBytes = Math.ceil(this.dimension * this.identity.BYTES_PER_ELEMENT / 8);
        stream.offset += trackerBytes;

        const result = new Uint8Array(this.clone(base).buffer);
        for (let i = 0; i < trackerBytes; ++i) {
            const start = i * 8;
            const indices = stream.readUint8At(trackerOffset + i);
            for (let j = 0; j < 8; ++j) {
                if (indices & (1 << j)) {
                    result[start + j] = stream.readUint8();
                }
            }
        }

        return result;
    }

    public getByteLength (vec:_MuVectorType<ValueSchema>) {
        return this.identity.byteLength;
    }
}
