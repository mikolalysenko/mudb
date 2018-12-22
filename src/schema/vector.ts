import { MuSchema } from './schema';
import { MuNumber } from './_number';
import {
    MuReadStream,
    MuWriteStream,
} from '../stream';

const muType2TypedArray = {
    float32: Float32Array,
    float64: Float64Array,
    int8: Int8Array,
    int16: Int16Array,
    int32: Int32Array,
    uint8: Uint8Array,
    uint16: Uint16Array,
    uint32: Uint32Array,
};

export type _Vector<ValueSchema extends MuNumber> = {
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
        implements MuSchema<_Vector<ValueSchema>> {
    public readonly identity:_Vector<ValueSchema>;
    public readonly muType = 'vector';
    public readonly json:object;

    private _constructor:typeof muType2TypedArray[ValueSchema['muType']];
    public readonly dimension:number;

    public pool:_Vector<ValueSchema>[] = [];

    constructor (valueSchema:ValueSchema, dimension:number) {
        this._constructor = muType2TypedArray[valueSchema.muType];

        this.identity = new this._constructor(dimension);
        for (let i = 0; i < dimension; ++i) {
            this.identity[i] = valueSchema.identity;
        }

        this.dimension = dimension;
        this.json = {
            type: 'vector',
            valueType: valueSchema.json,
            dimension,
        };
    }

    public alloc () : _Vector<ValueSchema> {
        return this.pool.pop() || new this._constructor(this.dimension);
    }

    public free (vec:_Vector<ValueSchema>) {
        this.pool.push(vec);
    }

    public equal (a:_Vector<ValueSchema>, b:_Vector<ValueSchema>) {
        if (!(a instanceof this._constructor) || !(b instanceof this._constructor)) {
            return false;
        }
        if (a.length !== b.length) {
            return false;
        }
        for (let i = a.length - 1; i >= 0 ; --i) {
            if (a[i] !== b[i]) {
                return false;
            }
        }

        return true;
    }

    public clone (vec:_Vector<ValueSchema>) : _Vector<ValueSchema> {
        const copy = this.alloc();
        copy.set(vec);
        return copy;
    }

    public assign (dst:_Vector<ValueSchema>, src:_Vector<ValueSchema>) {
        if (dst === src) {
            return;
        }
        dst.set(src);
    }

    public diff (
        base_:_Vector<ValueSchema>,
        target_:_Vector<ValueSchema>,
        out:MuWriteStream,
    ) : boolean {
        const base = new Uint8Array(base_.buffer);
        const target = new Uint8Array(target_.buffer);

        const dimension = this.identity.byteLength;
        out.grow(Math.ceil(this.identity.byteLength * 9 / 8));

        const headPtr = out.offset;

        let trackerOffset = headPtr;
        out.offset = trackerOffset + Math.ceil(dimension / 8);

        let tracker = 0;
        let numPatch = 0;

        for (let i = 0; i < dimension; ++i) {
            if (base[i] !== target[i]) {
                out.writeUint8(target[i]);
                tracker |= 1 << (i & 7);
                ++numPatch;
            }

            if ((i & 7) === 7) {
                out.writeUint8At(trackerOffset++, tracker);
                tracker = 0;
            }
        }

        if (numPatch === 0) {
            out.offset = headPtr;
            return false;
        }

        if (dimension & 7) {
            out.writeUint8At(trackerOffset, tracker);
        }
        return true;
    }

    public patch (
        base:_Vector<ValueSchema>,
        inp:MuReadStream,
    ) : _Vector<ValueSchema> {
        const resultArray = this.clone(base);
        const result = new Uint8Array(resultArray.buffer);

        const trackerOffset = inp.offset;
        const trackerBits = this.dimension * this.identity.BYTES_PER_ELEMENT;
        const trackerFullBytes = Math.floor(trackerBits / 8);
        const trackerBytes = Math.ceil(trackerBits / 8);
        inp.offset = trackerOffset + trackerBytes;

        for (let i = 0; i < trackerFullBytes; ++i) {
            const start = i * 8;
            const tracker = inp.readUint8At(trackerOffset + i);

            for (let j = 0; j < 8; ++j) {
                if (tracker & (1 << j)) {
                    result[start + j] = inp.readUint8();
                }
            }
        }

        if (trackerBits & 7) {
            const start = trackerFullBytes * 8;
            const tracker = inp.readUint8At(trackerOffset + trackerFullBytes);
            const partialBits = trackerBits & 7;

            for (let j = 0; j < partialBits; ++j) {
                if (tracker & (1 << j)) {
                    result[start + j] = inp.readUint8();
                }
            }
        }

        return resultArray;
    }

    public toJSON (vec:_Vector<ValueSchema>) : number[] {
        const arr = new Array(vec.length);
        for (let i = 0; i < arr.length; ++i) {
            arr[i] = vec[i];
        }
        return arr;
    }

    public fromJSON (json:number[]) : _Vector<ValueSchema> {
        const vec = this.alloc();
        for (let i = 0; i < vec.length; ++i) {
            vec[i] = json[i];
        }
        return vec;
    }
}
