import { MuSchema } from '../schema';
import { MuWriteStream, MuReadStream } from '../stream';

export class MuBytes implements MuSchema<Uint8Array> {
    public readonly muType = 'bytes';
    public readonly identity:Uint8Array;
    public readonly json:object;

    public pool:{ [dimension:string]:Uint8Array[] } = {};

    constructor (identity?:Uint8Array) {
        if (identity) {
            this.identity = identity.slice();
        } else {
            this.identity = new Uint8Array(1);
        }

        this.json = {
            type: 'bytes',
            identity: `[${(Array.prototype.slice.call(this.identity).join())}]`,
        };
    }

    private _allocBytes (length:number) : Uint8Array {
        return (this.pool[length] && this.pool[length].pop()) || new Uint8Array(length);
    }

    public alloc () : Uint8Array {
        return this._allocBytes(this.identity.length);
    }

    public free (bytes:Uint8Array) {
        const length = bytes.length;
        if (!this.pool[length]) {
            this.pool[length] = [];
        }
        this.pool[length].push(bytes);
    }

    public equal (a:Uint8Array, b:Uint8Array) {
        if (a.length !== b.length) {
            return false;
        }
        for (let i = a.length - 1; i >= 0; --i) {
            if (a[i] !== b[i]) {
                return false;
            }
        }
        return true;
    }

    public clone (bytes:Uint8Array) : Uint8Array {
        const copy = this._allocBytes(bytes.length);
        copy.set(bytes);
        return copy;
    }

    public assign (dst:Uint8Array, src:Uint8Array) : Uint8Array {
        if (dst.length !== src.length) {
            throw new Error('dst and src are of different lengths');
        }
        dst.set(src);
        return dst;
    }

    public diff (base:Uint8Array, target:Uint8Array, out:MuWriteStream) : boolean {
        const length = target.length;
        out.grow(5 + length);

        out.writeVarint(length);
        out.buffer.uint8.set(target, out.offset);
        out.offset += length;

        return true;
    }

    public patch (base:Uint8Array, inp:MuReadStream) : Uint8Array {
        const length = inp.readVarint();
        const target = this._allocBytes(length);

        const bytes = inp.buffer.uint8.subarray(inp.offset, inp.offset += length);
        target.set(bytes);
        return target;
    }

    public toJSON (bytes:Uint8Array) : number[] {
        const arr = new Array(bytes.length);
        for (let i = 0; i < arr.length; ++i) {
            arr[i] = bytes[i];
        }
        return arr;
    }

    public fromJSON (x:number[]) : Uint8Array {
        if (Array.isArray(x)) {
            const bytes = this._allocBytes(x.length);
            bytes.set(x);
            return bytes;
        }
        return this.clone(this.identity);
    }
}
