import { MuReadStream, MuWriteStream } from '../stream';
import { MuSchema } from './schema';
import { MuNumber } from './_number';

const ConstructorTable = {
    float32: Float32Array,
    float64: Float64Array,
    int8: Int8Array,
    int16: Int16Array,
    int32: Int32Array,
    uint8: Uint8Array,
    uint16: Uint16Array,
    uint32: Uint32Array,
};

type MuNumericType = keyof typeof ConstructorTable;

interface MuFloat32Array<D extends number> extends Float32Array {
    readonly length:D;
}
interface MuFloat64Array<D extends number> extends Float64Array {
    readonly length:D;
}
interface MuInt8Array<D extends number> extends Int8Array {
    readonly length:D;
}
interface MuInt16Array<D extends number> extends Int16Array {
    readonly length:D;
}
interface MuInt32Array<D extends number> extends Int32Array {
    readonly length:D;
}
interface MuUint8Array<D extends number> extends Uint8Array {
    readonly length:D;
}
interface MuUint16Array<D extends number> extends Uint16Array {
    readonly length:D;
}
interface MuUint32Array<D extends number> extends Uint32Array {
    readonly length:D;
}

type Vec<T extends MuNumericType, D extends number> = {
    float32:MuFloat32Array<D>;
    float64:MuFloat64Array<D>;
    int8:MuInt8Array<D>;
    int16:MuInt16Array<D>;
    int32:MuInt32Array<D>;
    uint8:MuUint8Array<D>;
    uint16:MuUint16Array<D>;
    uint32:MuUint32Array<D>;
}[MuNumber<T>['muType']];

export class MuVector<T extends MuNumericType, D extends number> implements MuSchema<Vec<T, D>> {
    public readonly identity:Vec<T, D>;
    public readonly muType = 'vector';
    public readonly muData:MuNumber<T>;
    public readonly json:object;

    public readonly dimension:D;
    private _constructor:any;

    private _pool:Vec<T, D>[] = [];

    constructor (schema:MuNumber<T>, dimension:D) {
        this.muData = schema;
        this.dimension = dimension;
        this._constructor = ConstructorTable[schema.muType];
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

    public alloc () : Vec<T, D> {
        return this._pool.pop() || new this._constructor(this.dimension);
    }

    public free (vec:Vec<T, D>) : void {
        this._pool.push(vec);
    }

    public equal (a:Vec<T, D>, b:Vec<T, D>) : boolean {
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

    public clone (vec:Vec<T, D>) : Vec<T, D> {
        const copy = this.alloc();
        copy.set(vec);
        return copy;
    }

    public assign (dst:Vec<T, D>, src:Vec<T, D>) : Vec<T, D> {
        dst.set(src);
        return dst;
    }

    public diff (base_:Vec<T, D>, target_:Vec<T, D>, out:MuWriteStream) : boolean {
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

    public patch (base:Vec<T, D>, inp:MuReadStream) : Vec<T, D> {
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

    public toJSON (vec:Vec<T, D>) : number[] {
        const arr = new Array(vec.length);
        for (let i = 0; i < arr.length; ++i) {
            arr[i] = vec[i];
        }
        return arr;
    }

    public fromJSON (x:number[]) : Vec<T, D> {
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
