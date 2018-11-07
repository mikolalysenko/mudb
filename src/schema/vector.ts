import { MuSchema } from './schema';
import { MuNumber } from './_number';
import {
    MuReadStream,
    MuWriteStream,
} from '../stream';

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

    public free (vec:_MuVectorType<ValueSchema>) {
        this._pool.push(vec);
    }

    public equal (x:_MuVectorType<ValueSchema>, y:_MuVectorType<ValueSchema>) {
        if (!(x instanceof this._constructor) || !(y instanceof this._constructor)) {
            return false;
        }
        if (x.length !== y.length) {
            return false;
        }
        for (let i = x.length - 1; i >= 0 ; --i) {
            if (x[i] !== y[i]) {
                return false;
            }
        }

        return true;
    }

    public clone (vec:_MuVectorType<ValueSchema>) : _MuVectorType<ValueSchema> {
        const copy = this.alloc();
        copy.set(vec);
        return copy;
    }

    public copy (source:_MuVectorType<ValueSchema>, target:_MuVectorType<ValueSchema>) {
        if (source === target) {
            return;
        }
        target.set(source);
    }

    public diff (
        base_:_MuVectorType<ValueSchema>,
        target_:_MuVectorType<ValueSchema>,
        stream:MuWriteStream,
    ) : boolean {
        const base = new Uint8Array(base_.buffer);
        const target = new Uint8Array(target_.buffer);

        const dimension = this.identity.byteLength;
        stream.grow(Math.ceil(this.identity.byteLength * 9 / 8));

        const headPtr = stream.offset;

        let trackerOffset = headPtr;
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

        if (numPatch === 0) {
            stream.offset = headPtr;
            return false;
        }

        if (dimension & 7) {
            stream.writeUint8At(trackerOffset, tracker);
        }
        return true;
    }

    public patch (
        base:_MuVectorType<ValueSchema>,
        stream:MuReadStream,
    ) : _MuVectorType<ValueSchema> {
        const resultArray = this.clone(base);
        const result = new Uint8Array(resultArray.buffer);

        const trackerOffset = stream.offset;
        const trackerBits = this.dimension * this.identity.BYTES_PER_ELEMENT;
        const trackerFullBytes = Math.floor(trackerBits / 8);
        const trackerBytes = Math.ceil(trackerBits / 8);
        stream.offset = trackerOffset + trackerBytes;

        for (let i = 0; i < trackerFullBytes; ++i) {
            const start = i * 8;
            const tracker = stream.readUint8At(trackerOffset + i);

            for (let j = 0; j < 8; ++j) {
                if (tracker & (1 << j)) {
                    result[start + j] = stream.readUint8();
                }
            }
        }

        if (trackerBits & 7) {
            const start = trackerFullBytes * 8;
            const tracker = stream.readUint8At(trackerOffset + trackerFullBytes);
            const partialBits = trackerBits & 7;

            for (let j = 0; j < partialBits; ++j) {
                if (tracker & (1 << j)) {
                    result[start + j] = stream.readUint8();
                }
            }
        }

        return resultArray;
    }
}
