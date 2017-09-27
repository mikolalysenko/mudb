// round to next highest power of 2
function ceilLog2 (v_) {
    let v = v_ - 1;
    let r = (v > 0xFFFF) ? 1 << 4 : 0;
    v >>>= r;
    let shift = (v > 0xFF) ? 1 << 3 : 0;
    v >>>= shift;
    r |= shift;
    shift = (v > 0xF) ? 1 << 2 : 0;
    v >>>= shift;
    r |= shift;
    shift = (v > 0x3) ? 1 << 1 : 0;
    v >>>= shift;
    r |= shift;
    return (r | (v >> 1)) + 1;
}

export class HelBuffer {
    public buffer:ArrayBuffer;
    public uint8:Uint8Array;
    public uint16:Uint16Array[];
    public uint32:Uint32Array[];
    public float64:Float64Array[];

    // TODO finish support for all types

    constructor (size:number) {
        const uint8 = this.uint8 = new Uint8Array(size);
        const buffer = this.buffer = uint8.buffer;

        this.uint16 = [
            new Uint16Array(buffer), 
            new Uint16Array(buffer, 2)
        ];
        this.uint32 = [
            new Uint32Array(buffer), 
            new Uint32Array(buffer, 4), 
            new Uint32Array(buffer, 8),
            new Uint32Array(buffer, 12)
        ];
        console.log('', buffer.byteLength);
        this.float64 = [0,8,16,24,32,40,48,56].map((i) => {
            console.log('i', i);
            if (i==0) {
                return new Float64Array(buffer);
            }
            return new Float64Array(buffer, i);
        });
    }
};

// initialize buffer pool
const bufferPool:HelBuffer[][] = new Array(32);
for (let i = 0; i < 32; ++i) {
    bufferPool[i] = [];
}

export function allocBuffer (sz) : HelBuffer {
    const b = ceilLog2(sz);
    return bufferPool[b].pop() || new HelBuffer(1 << b);
}

export function freeBuffer (buffer:HelBuffer) {
    const pool = bufferPool[ceilLog2(buffer.uint8.length)];
    pool.push(buffer);
}

export function reallocBuffer (buffer:HelBuffer, nsize:number) {
    if (buffer.uint8.length <= nsize) {
        return buffer;
    }
    const result = allocBuffer(nsize);
    result.uint8.set(buffer.uint8);
    freeBuffer(buffer);
    return result;
}

export class HelStream {
    public buffer:HelBuffer;
    public offset:number;

    constructor (capacity:number) {
        this.buffer = allocBuffer(capacity);
        this.offset = 0;
    }

    public destroy () {
        freeBuffer(this.buffer);
    }

    public grow (bytes:number) {
        this.buffer = reallocBuffer(this.buffer, this.offset + bytes);
    }

    public writeUint8 (x:number) {
        this.buffer.uint8[this.offset++] = x;
    }

    public writeUint16 (x:number) {
        this.buffer.uint16[this.offset & 1][this.offset >> 1] = x;
        this.offset += 2;
    }

    public writeUint32 (x:number) {
        this.buffer.uint32[this.offset & 3][this.offset >> 2] = x;
        this.offset += 4;
    }

    public writeFloat64 (x:number) {
        this.buffer.float64[this.offset & 7][this.offset >> 4] = x;
        this.offset += 8;
    }

    public readUint8 () : number {
        return this.buffer.uint8[this.offset++];
    }

    public readUint16 () : number {
        const offset = this.offset;
        this.offset += 2;
        return this.buffer.uint16[offset & 1][offset >> 1];
    }

    public readUint32 () : number {
        const offset = this.offset;
        this.offset += 4;
        return this.buffer.uint16[offset & 3][offset >> 2];
    }

    public readFloat64 () : number {
        const offset = this.offset;
        this.offset += 8;
        return this.buffer.float64[offset & 7][offset >> 4];
    }
}