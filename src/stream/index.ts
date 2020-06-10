const root = (typeof self == 'object' && self['Object'] == Object && self)
          || (typeof global == 'object' && global['Object'] == Object && global);

export let encodeUTF8:(str:string) => Uint8Array;
export let decodeUTF8:(bytes:Uint8Array) => string;

// TextEncoder and TextDecoder have become globals since Node v11
if (typeof root === 'object' && 'TextEncoder' in root) {
    const encoder = new TextEncoder();
    encodeUTF8 = (str) => encoder.encode(str);
    const decoder = new TextDecoder();
    decodeUTF8 = (bytes) => decoder.decode(bytes);
} else {
    const codec = require('./codec');
    encodeUTF8 = codec.encode;
    decodeUTF8 = codec.decode;
}

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
    public dataView:DataView;
    public uint8:Uint8Array;

    constructor (buffer:ArrayBuffer) {
        this.buffer = buffer;
        this.dataView = new DataView(buffer);
        this.uint8 = new Uint8Array(buffer);
    }
}

// initialize buffer pool
const bufferPool:MuBuffer[][] = new Array(31);
for (let i = 0; i < 31; ++i) {
    bufferPool[i] = [];
}

export function allocBuffer (size:number) : MuBuffer {
    if (size > 0x40000000 || size < 0) {
        throw new RangeError(`size out of range: ${size}`);
    }
    size = Math.max(2, size | 0);
    const b = ceilLog2(size);
    return bufferPool[b].pop() || new MuBuffer(new ArrayBuffer(1 << b));
}

export function freeBuffer (buffer:MuBuffer) {
    if (buffer.uint8.length > 0) {
        bufferPool[ceilLog2(buffer.uint8.length)].push(buffer);
    }
}

const LITTLE_ENDIAN = true;

export class MuWriteStream {
    public buffer:MuBuffer;
    public offset:number;

    constructor (capacity:number) {
        this.buffer = allocBuffer(capacity);
        this.offset = 0;
    }

    public bytes () {
        return this.buffer.uint8.subarray(0, this.offset);
    }

    public destroy () {
        freeBuffer(this.buffer);
    }

    public grow (bytes:number) {
        const newSize = this.offset + bytes;
        const uint8 = this.buffer.uint8;
        if (uint8.length < newSize) {
            const buffer = allocBuffer(newSize);
            buffer.uint8.set(uint8);
            freeBuffer(this.buffer);
            this.buffer = buffer;
        }
    }

    public writeInt8 (x:number) {
        this.buffer.dataView.setInt8(this.offset, x);
        this.offset += 1;
    }

    public writeInt16 (x:number) {
        this.buffer.dataView.setInt16(this.offset, x, LITTLE_ENDIAN);
        this.offset += 2;
    }

    public writeInt32 (x:number) {
        this.buffer.dataView.setInt32(this.offset, x, LITTLE_ENDIAN);
        this.offset += 4;
    }

    public writeUint8 (x:number) {
        this.buffer.dataView.setUint8(this.offset, x);
        this.offset += 1;
    }

    public writeUint16 (x:number) {
        this.buffer.dataView.setUint16(this.offset, x, LITTLE_ENDIAN);
        this.offset += 2;
    }

    public writeUint32 (x:number) {
        this.buffer.dataView.setUint32(this.offset, x, LITTLE_ENDIAN);
        this.offset += 4;
    }

    public writeFloat32 (x:number) {
        this.buffer.dataView.setFloat32(this.offset, x, LITTLE_ENDIAN);
        this.offset += 4;
    }

    public writeFloat64 (x:number) {
        this.buffer.dataView.setFloat64(this.offset, x, LITTLE_ENDIAN);
        this.offset += 8;
    }

    // little-endian
    // set MSB in each byte except the last
    public writeVarint (x:number) {
        const x_ = x >>> 0;
        const bytes = this.buffer.uint8;
        let offset = this.offset;

        if (x_ < 0x80) {
            bytes[offset++] = x_;
        } else if (x_ < 0x4000) {
            bytes[offset++] = x_ & 0x7f | 0x80;
            bytes[offset++] = x_ >>> 7;
        } else if (x_ < 0x200000) {
            bytes[offset++] = x_ & 0x7f | 0x80;
            bytes[offset++] = x_ >> 7 & 0x7f | 0x80;
            bytes[offset++] = x_ >>> 14;
        } else if (x_ < 0x10000000) {
            bytes[offset++] = x_ & 0x7f | 0x80;
            bytes[offset++] = x_ >> 7 & 0x7f | 0x80;
            bytes[offset++] = x_ >> 14 & 0x7f | 0x80;
            bytes[offset++] = x_ >>> 21;
        } else {
            bytes[offset++] = x_ & 0x7f | 0x80;
            bytes[offset++] = x_ >> 7 & 0x7f | 0x80;
            bytes[offset++] = x_ >> 14 & 0x7f | 0x80;
            bytes[offset++] = x_ >> 21 & 0x7f | 0x80;
            bytes[offset++] = x_ >>> 28;
        }
        this.offset = offset;
    }

    public writeASCII (str:string) {
        const bytes = this.buffer.uint8;
        let ptr = this.offset;
        for (let i = 0; i < str.length; ++i) {
            bytes[ptr++] = str.charCodeAt(i);
        }
        this.offset = ptr;
    }

    public writeString (str:string) {
        const bytes = encodeUTF8(str);
        this.grow(5 + bytes.length);
        this.writeVarint(bytes.length);
        this.buffer.uint8.set(bytes, this.offset);
        this.offset += bytes.length;
    }

    public writeUint8At (offset:number, x:number) {
        this.buffer.dataView.setUint8(offset, x);
    }

    public writeUint32At (offset:number, x:number) {
        this.buffer.dataView.setUint32(offset, x, LITTLE_ENDIAN);
    }
}

export class MuReadStream {
    public buffer:MuBuffer;
    public offset:number;
    public length:number;

    constructor (data:Uint8Array) {
        this.buffer = new MuBuffer(data.buffer);
        this.offset = data.byteOffset;
        this.length = data.byteLength + data.byteOffset;
    }

    public bytes () {
        return this.buffer.uint8.subarray(this.offset, this.length);
    }

    public checkBounds () {
        if (this.offset > this.length) {
            throw new Error('out of bounds');
        }
    }

    public readInt8 () : number {
        const offset = this.offset;
        this.offset += 1;
        this.checkBounds();
        return this.buffer.dataView.getInt8(offset);
    }

    public readInt16 () : number {
        const offset = this.offset;
        this.offset += 2;
        this.checkBounds();
        return this.buffer.dataView.getInt16(offset, LITTLE_ENDIAN);
    }

    public readInt32 () : number {
        const offset = this.offset;
        this.offset += 4;
        this.checkBounds();
        return this.buffer.dataView.getInt32(offset, LITTLE_ENDIAN);
    }

    public readUint8 () : number {
        const offset = this.offset;
        this.offset += 1;
        this.checkBounds();
        return this.buffer.dataView.getUint8(offset);
    }

    public readUint16 () : number {
        const offset = this.offset;
        this.offset += 2;
        this.checkBounds();
        return this.buffer.dataView.getUint16(offset, LITTLE_ENDIAN);
    }

    public readUint32 () : number {
        const offset = this.offset;
        this.offset += 4;
        this.checkBounds();
        return this.buffer.dataView.getUint32(offset, LITTLE_ENDIAN);
    }

    public readFloat32 () : number {
        const offset = this.offset;
        this.offset += 4;
        this.checkBounds();
        return this.buffer.dataView.getFloat32(offset, LITTLE_ENDIAN);
    }

    public readFloat64 () : number {
        const offset = this.offset;
        this.offset += 8;
        this.checkBounds();
        return this.buffer.dataView.getFloat64(offset, LITTLE_ENDIAN);
    }

    public readVarint () : number {
        const bytes = this.buffer.uint8;
        let offset = this.offset;

        const x0 = bytes[offset++];
        if (x0 < 0x80) {
            this.offset = offset;
            this.checkBounds();
            return x0;
        }
        const x1 = bytes[offset++];
        if (x1 < 0x80) {
            this.offset = offset;
            this.checkBounds();
            return (x0 & 0x7f) |
                (x1 << 7);
        }
        const x2 = bytes[offset++];
        if (x2 < 0x80) {
            this.offset = offset;
            this.checkBounds();
            return (x0 & 0x7f) |
                ((x1 & 0x7f) << 7) |
                (x2 << 14);
        }
        const x3 = bytes[offset++];
        if (x3 < 0x80) {
            this.offset = offset;
            this.checkBounds();
            return (x0 & 0x7f) |
                ((x1 & 0x7f) << 7) |
                ((x2 & 0x7f) << 14) |
                (x3 << 21);
        }
        const x4 = bytes[offset++];
        this.offset = offset;
        this.checkBounds();
        return (x0 & 0x7f) +
            ((x1 & 0x7f) << 7) +
            ((x2 & 0x7f) << 14) +
            ((x3 & 0x7f) << 21) +
            (x4 * (1 << 28));
    }

    public readASCII (length:number) : string {
        const head = this.offset;
        this.offset += length;
        this.checkBounds();
        let str = '';
        for (let i = head; i < this.offset; ++i) {
            str += String.fromCharCode(this.buffer.uint8[i]);
        }
        return str;
    }

    public readString () : string {
        const byteLength = this.readVarint();
        const head = this.offset;
        this.offset += byteLength;
        this.checkBounds();
        const bytes = this.buffer.uint8.subarray(head, this.offset);
        return decodeUTF8(bytes);
    }

    public readUint8At (offset:number) : number {
        return this.buffer.dataView.getUint8(offset);
    }
}
