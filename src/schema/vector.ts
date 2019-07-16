import { MuReadStream, MuWriteStream } from '../stream';
import { MuSchema } from './schema';
import { MuNumber } from './_number';

export interface MuFloat32Array<D extends number> extends Float32Array {
    readonly length:D;
}
export interface MuFloat64Array<D extends number> extends Float64Array {
    readonly length:D;
}
export interface MuInt8Array<D extends number> extends Int8Array {
    readonly length:D;
}
export interface MuInt16Array<D extends number> extends Int16Array {
    readonly length:D;
}
export interface MuInt32Array<D extends number> extends Int32Array {
    readonly length:D;
}
export interface MuUint8Array<D extends number> extends Uint8Array {
    readonly length:D;
}
export interface MuUint16Array<D extends number> extends Uint16Array {
    readonly length:D;
}
export interface MuUint32Array<D extends number> extends Uint32Array {
    readonly length:D;
}

export interface MuFloat32ArrayConstructor {
    new<D extends number> (length:D) : MuFloat32Array<D>;
}
export interface MuFloat64ArrayConstructor {
    new<D extends number> (length:D) : MuFloat64Array<D>;
}
export interface MuInt8ArrayConstructor {
    new<D extends number> (length:D) : MuInt8Array<D>;
}
export interface MuInt16ArrayConstructor {
    new<D extends number> (length:D) : MuInt16Array<D>;
}
export interface MuInt32ArrayConstructor {
    new<D extends number> (length:D) : MuInt32Array<D>;
}
export interface MuUint8ArrayConstructor {
    new<D extends number> (length:D) : MuUint8Array<D>;
}
export interface MuUint16ArrayConstructor {
    new<D extends number> (length:D) : MuUint16Array<D>;
}
export interface MuUint32ArrayConstructor {
    new<D extends number> (length:D) : MuUint32Array<D>;
}

export interface MuTypedArrayConstructorTable {
    float32:MuFloat32ArrayConstructor;
    float64:MuFloat64ArrayConstructor;
    int8:MuInt8ArrayConstructor;
    int16:MuInt16ArrayConstructor;
    int32:MuInt32ArrayConstructor;
    uint8:MuUint8ArrayConstructor;
    uint16:MuUint16ArrayConstructor;
    uint32:MuUint32ArrayConstructor;
}

export const ConstructorTable:MuTypedArrayConstructorTable = {
    float32: Float32Array,
    float64: Float64Array,
    int8: Int8Array,
    int16: Int16Array,
    int32: Int32Array,
    uint8: Uint8Array,
    uint16: Uint16Array,
    uint32: Uint32Array,
};

export type MuVectorNumericType =
    'float32'   |
    'float64'   |
    'int8'      |
    'int16'     |
    'int32'     |
    'uint8'     |
    'uint16'    |
    'uint32';

export type Vector<ValueSchema extends MuNumber<MuVectorNumericType>, D extends number> = {
    float32:MuFloat32Array<D>;
    float64:MuFloat64Array<D>;
    int8:MuInt8Array<D>;
    int16:MuInt16Array<D>;
    int32:MuInt32Array<D>;
    uint8:MuUint8Array<D>;
    uint16:MuUint16Array<D>;
    uint32:MuUint32Array<D>;
}[ValueSchema['muType']];

export class MuVector<ValueSchema extends MuNumber<MuVectorNumericType>, D extends number>
        implements MuSchema<Vector<ValueSchema, D>> {
    public readonly identity:Vector<ValueSchema, D>;
    public readonly muType = 'vector';
    public readonly muData:ValueSchema;
    public readonly json:object;

    private _constructor:typeof ConstructorTable[ValueSchema['muType']];
    public readonly dimension:D;

    public pool:Vector<ValueSchema, D>[] = [];

    constructor (schema:ValueSchema, dimension:D) {
        this.muData = schema;
        this._constructor = ConstructorTable[schema.muType];
        this.dimension = dimension;
        this.identity = new this._constructor(dimension);
        for (let i = 0; i < dimension; ++i) {
            this.identity[i] = schema.identity;
        }
        this.json = {
            type: 'vector',
            valueType: schema.json,
            dimension,
        };
    }

    public alloc () : Vector<ValueSchema, D> {
        return this.pool.pop() || new this._constructor(this.dimension);
    }

    public free (vec:Vector<ValueSchema, D>) : void {
        this.pool.push(vec);
    }

    public equal (
        a:Vector<ValueSchema, D>,
        b:Vector<ValueSchema, D>,
    ) : boolean {
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

    public clone (vec:Vector<ValueSchema, D>) : Vector<ValueSchema, D> {
        const copy = this.alloc();
        copy.set(vec);
        return copy;
    }

    public assign (
        dst:Vector<ValueSchema, D>,
        src:Vector<ValueSchema, D>,
    ) : Vector<ValueSchema, D> {
        dst.set(src);
        return dst;
    }

    public diff (
        base_:Vector<ValueSchema, D>,
        target_:Vector<ValueSchema, D>,
        out:MuWriteStream,
    ) : boolean {
        const base = new Uint8Array(base_.buffer);
        const target = new Uint8Array(target_.buffer);

        const byteLength = this.identity.byteLength;
        out.grow(Math.ceil(byteLength * 9 / 8));

        const head = out.offset;
        let trackerOffset = head;
        out.offset += Math.ceil(byteLength / 8);

        let tracker = 0;
        let numPatches = 0;

        for (let i = 0; i < byteLength; ++i) {
            if (base[i] !== target[i]) {
                out.writeUint8(target[i]);
                tracker |= 1 << (i & 7);
                ++numPatches;
            }

            if ((i & 7) === 7) {
                out.writeUint8At(trackerOffset++, tracker);
                tracker = 0;
            }
        }

        if (numPatches === 0) {
            out.offset = head;
            return false;
        }
        if (byteLength & 7) {
            out.writeUint8At(trackerOffset, tracker);
        }
        return true;
    }

    public patch (
        base:Vector<ValueSchema, D>,
        inp:MuReadStream,
    ) : Vector<ValueSchema, D> {
        const head = inp.offset;
        const numTrackerBits = this.dimension * this.identity.BYTES_PER_ELEMENT;
        const numTrackerFullBytes = Math.floor(numTrackerBits / 8);
        const numTrackerBytes = Math.ceil(numTrackerBits / 8);
        inp.offset = head + numTrackerBytes;

        const result = this.clone(base);
        const uint8View = new Uint8Array(result.buffer);
        for (let i = 0; i < numTrackerFullBytes; ++i) {
            const start = i * 8;
            const tracker = inp.readUint8At(head + i);
            for (let j = 0; j < 8; ++j) {
                if (tracker & (1 << j)) {
                    uint8View[start + j] = inp.readUint8();
                }
            }
        }
        if (numTrackerBits & 7) {
            const start = numTrackerFullBytes * 8;
            const tracker = inp.readUint8At(head + numTrackerFullBytes);
            const partialBits = numTrackerBits & 7;
            for (let j = 0; j < partialBits; ++j) {
                if (tracker & (1 << j)) {
                    uint8View[start + j] = inp.readUint8();
                }
            }
        }
        return result;
    }

    public toJSON (vec:Vector<ValueSchema, D>) : number[] {
        const arr = new Array(vec.length);
        for (let i = 0; i < arr.length; ++i) {
            arr[i] = vec[i];
        }
        return arr;
    }

    public fromJSON (x:number[]) : Vector<ValueSchema, D> {
        if (Array.isArray(x)) {
            const vec = this.alloc();
            for (let i = 0; i < vec.length; ++i) {
                vec[i] = this.muData.fromJSON(x[i]);
            }
            return vec;
        }
        return this.clone(this.identity);
    }
}
