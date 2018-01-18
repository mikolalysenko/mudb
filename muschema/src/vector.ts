import { MuSchema } from './schema';
import { MuNumber } from './_number';
import {
    MuReadStream,
    MuWriteStream,
} from 'mustreams';

import { muType2TypedArray } from './constants';

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

export class MuVector<ValueSchema extends MuNumber>
        implements MuSchema<_MuVectorType<ValueSchema>> {
    private _constructor:typeof muType2TypedArray[ValueSchema['muType']];
    private _pool:_MuVectorType<ValueSchema>[] = [];

    public readonly identity:_MuVectorType<ValueSchema>;
    public readonly muType = 'vector';
    public readonly muData:ValueSchema;
    public readonly json:object;

    public readonly dimension:number;

    constructor (valueSchema:ValueSchema, dimension:number) {
        this._constructor = muType2TypedArray[valueSchema.muType];

        this.identity = new this._constructor(dimension);
        for (let i = 0; i < dimension; ++i) {
            this.identity[i] = valueSchema.identity;
        }

        this.muData = valueSchema;
        this.dimension = dimension;
        this.json = {
            type: 'vector',
            valueType: this.muData.json,
            dimension,
        };
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

    // bytes for trackers +
    // bytes enough to hold the value of vec
    public calcByteLength (vec:_MuVectorType<ValueSchema>) {
        return Math.ceil(this.identity.byteLength * 9 / 8);
    }

    public diff (
        base_:_MuVectorType<ValueSchema>,
        target_:_MuVectorType<ValueSchema>,
        stream:MuWriteStream,
    ) : boolean {
        const base = new Uint8Array(base_.buffer);
        const target = new Uint8Array(target_.buffer);

        const dimension = this.identity.byteLength;
        stream.grow(this.calcByteLength(target));

        let trackerOffset = stream.offset;
        stream.offset = trackerOffset + Math.ceil(dimension / 8);

        let tracker = 0;
        let numPatch = 0;

        for (let i = 0; i < dimension; ++i) {
            if (base[i] !== target[i]) {
                stream.writeUint8(target[i]);
                tracker |= 1 << (i & 7);
                ++numPatch;
            }

            if ((i & 7) === 7) {
                stream.writeUint8At(trackerOffset++, tracker);
                tracker = 0;
            }
        }

        if (dimension & 7) {
            stream.writeUint8At(trackerOffset, tracker);
        }

        return numPatch > 0;
    }

    public patch (
        base:_MuVectorType<ValueSchema>,
        stream:MuReadStream,
    ) : Uint8Array {
        const result = new Uint8Array(this.clone(base).buffer);

        const trackerOffset = stream.offset;
        const trackerBytes = Math.ceil(this.dimension * this.identity.BYTES_PER_ELEMENT / 8);
        stream.offset = trackerOffset + trackerBytes;

        for (let i = 0; i < trackerBytes; ++i) {
            const start = i * 8;
            const tracker = stream.readUint8At(trackerOffset + i);

            for (let j = 0; j < 8; ++j) {
                if (tracker & (1 << j)) {
                    result[start + j] = stream.readUint8();
                }
            }
        }

        return result;
    }
}
