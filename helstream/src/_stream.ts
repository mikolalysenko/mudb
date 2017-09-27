import StringEncode = require('./string');
const {
    encodeString,
    decodeString,
} = StringEncode;

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
    public uint16:Uint16Array;
    public uint32:Uint32Array;

    // TODO finish support for all types

    constructor (buffer:ArrayBuffer) {
        this.buffer = buffer;

        this.uint8 = new Uint8Array(buffer);
        this.uint16 = new Uint16Array(buffer);
        this.uint32 = new Uint32Array(buffer);
    }
};

// initialize buffer pool
const bufferPool:HelBuffer[][] = new Array(32);
for (let i = 0; i < 32; ++i) {
    bufferPool[i] = [];
}

export function allocBuffer (sz) : HelBuffer {
    const b = ceilLog2(sz);
    return bufferPool[b].pop() || new HelBuffer(new Uint8Array(1 << b).buffer);
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

const SCRATCH_BUFFER = new HelBuffer(new Uint8Array(8).buffer);

export class HelWriteStream {
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
        const offset = this.offset;
        if (offset & 1) {
            SCRATCH_BUFFER.uint16[0] = x;
            const xbytes = SCRATCH_BUFFER.uint8;
            const bytes = this.buffer.uint8;
            bytes[offset] = xbytes[0];
            bytes[offset + 1] = xbytes[1];
        } else {
            this.buffer.uint16[offset >> 1] = x;
        }
        this.offset += 2;
    }

    public writeUint32 (x:number) {
        const offset = this.offset;
        if (offset & 3) {
            SCRATCH_BUFFER.uint32[0] = x;
            const xbytes = SCRATCH_BUFFER.uint8;
            const bytes = this.buffer.uint8;
            bytes[offset] = xbytes[0];
            bytes[offset + 1] = xbytes[1];
            bytes[offset + 2] = xbytes[2];
            bytes[offset + 3] = xbytes[3];
        } else {
            this.buffer.uint32[offset >> 2] = x;
        }
    }

    public writeString (str:string) {
        const bytes = encodeString(str);
        this.writeUint32(bytes.length);
        this.buffer.uint8.set(bytes, this.offset);
        this.offset += bytes.length;
    }

}

export class HelReadStream {
    public buffer:HelBuffer;
    public offset:number = 0;

    constructor (buffer:ArrayBuffer) {
        this.buffer = new HelBuffer(buffer);
    }

    public readUint8 () : number {
        return this.buffer.uint8[this.offset++];
    }

    public readUint16 () : number {
        const offset = this.offset;
        this.offset += 2;
        if (offset & 1) {
            const bytes = this.buffer.uint8;
            const xbytes = SCRATCH_BUFFER.uint8;
            xbytes[0] = bytes[offset];
            xbytes[1] = bytes[offset + 1];
            return SCRATCH_BUFFER.uint16[0];
        }
        return this.buffer.uint16[offset >> 1];                
    }

    public readUint32 () : number {
        const offset = this.offset;
        this.offset += 4;
        if (offset & 3) {
            const bytes = this.buffer.uint8;
            const xbytes = SCRATCH_BUFFER.uint8;
            xbytes[0] = bytes[offset];
            xbytes[1] = bytes[offset + 1];
            xbytes[2] = bytes[offset + 2];
            xbytes[3] = bytes[offset + 3];
            return SCRATCH_BUFFER.uint32[0];
        }
        return this.buffer.uint32[offset >> 2];
    }

    public readString () {
        const byteLength = this.readUint32();
        const bytes = this.buffer.uint8.subarray(this.offset, this.offset + byteLength);
        this.offset += byteLength;
        return decodeString(bytes);
    }
}