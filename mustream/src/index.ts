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

export class MuBuffer {
    public buffer:ArrayBuffer;
    public uint8:Uint8Array;
    public uint16:Uint16Array;
    public uint32:Uint32Array;
    public float64:Float64Array;
    // TODO finish support for all types

    constructor (buffer:ArrayBuffer) {
        this.buffer = buffer;
        this.uint8 = new Uint8Array(buffer);
        this.uint16 = new Uint16Array(buffer);
        this.uint32 = new Uint32Array(buffer);
        this.float64 = new Float64Array(buffer);
    }
}

// initialize buffer pool
const bufferPool:MuBuffer[][] = new Array(32);
for (let i = 0; i < 32; ++i) {
    bufferPool[i] = [];
}

export function allocBuffer (size) : MuBuffer {
    const b = ceilLog2(size);
    return bufferPool[b].pop() || new MuBuffer(new ArrayBuffer(1 << b));
}

export function freeBuffer (buffer:MuBuffer) {
    bufferPool[ceilLog2(buffer.uint8.length)].push(buffer);
}

export function reallocBuffer (buffer:MuBuffer, nsize:number) {
    if (buffer.uint8.length > nsize) {
        return buffer;
    }
    const result = allocBuffer(nsize);
    result.uint8.set(buffer.uint8);
    freeBuffer(buffer);
    return result;
}

const SCRATCH_BUFFER = new MuBuffer(new ArrayBuffer(8));

export class MuWriteStream {
    public buffer:MuBuffer;
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
        this.offset += 4;
    }

    public writeFloat64 (x:number) {
        const offset = this.offset;
        if (offset & 7) {
            SCRATCH_BUFFER.float64[0] = x;
            const xbytes = SCRATCH_BUFFER.uint8;
            const bytes = this.buffer.uint8;
            for (let i = 0; i <= 7; ++i) {
                bytes[offset + i] = xbytes[i];
            }
        } else {
            this.buffer.float64[offset >> 4] = x;
        }
        this.offset += 8;
    }

    public writeString (str:string) {
        const bytes = encodeString(str);
        this.writeUint32(bytes.length);
        this.buffer.uint8.set(bytes, this.offset);
        this.offset += bytes.length;
    }
}

export class MuReadStream {
    public buffer:MuBuffer;
    public offset:number = 0;

    constructor (buffer:ArrayBuffer) {
        this.buffer = new MuBuffer(buffer);
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

    public readFloat64 () : number {
        const offset = this.offset;
        this.offset += 8;
        if (offset & 7) {
            const bytes = this.buffer.uint8;
            const xbytes = SCRATCH_BUFFER.uint8;
            for (let i = 0; i <= 7; ++i) {
                xbytes[i] = bytes[offset + i];
            }
            return SCRATCH_BUFFER.float64[0];
        }
        return this.buffer.float64[offset >> 3];
    }

    public readString () {
        const byteLength = this.readUint32();
        const bytes = this.buffer.uint8.subarray(this.offset, this.offset + byteLength);
        this.offset += byteLength;
        return decodeString(bytes);
    }
}
