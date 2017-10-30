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
    public dataView:DataView;
    public int8:Int8Array;
    public int16:Int16Array;
    public int32:Int32Array;
    public uint8:Uint8Array;
    public uint16:Uint16Array;
    public uint32:Uint32Array;
    public float32:Float32Array;
    public float64:Float64Array;

    constructor (buffer:ArrayBuffer) {
        this.buffer = buffer;
        this.dataView = new DataView(buffer);
        this.int8 = new Int8Array(buffer);
        this.int16 = new Int16Array(buffer);
        this.int32 = new Int32Array(buffer);
        this.uint8 = new Uint8Array(buffer);
        this.uint16 = new Uint16Array(buffer);
        this.uint32 = new Uint32Array(buffer);
        this.float32 = new Float32Array(buffer);
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
const LITTLE_ENDIAN = true;

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

    public writeInt8 (x:number) {
        this.buffer.dataView.setInt8(this.offset++, x);
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
        this.buffer.dataView.setUint8(this.offset++, x);
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

    constructor (buffer:MuBuffer) {
        this.buffer = buffer;
    }

    public readInt8 () : number {
        return this.buffer.dataView.getInt8(this.offset++);
    }

    public readInt16 () : number {
        const offset = this.offset;
        this.offset += 2;
        return this.buffer.dataView.getInt16(offset, LITTLE_ENDIAN);
    }

    public readInt32 () : number {
        const offset = this.offset;
        this.offset += 4;
        return this.buffer.dataView.getInt32(offset, LITTLE_ENDIAN);
    }

    public readUint8 () : number {
        return this.buffer.dataView.getUint8(this.offset++);
    }

    public readUint16 () : number {
        const offset = this.offset;
        this.offset += 2;
        return this.buffer.dataView.getUint16(offset, LITTLE_ENDIAN);
    }

    public readUint32 () : number {
        const offset = this.offset;
        this.offset += 4;
        return this.buffer.dataView.getUint32(offset, LITTLE_ENDIAN);
    }

    public readFloat32 () : number {
        const offset = this.offset;
        this.offset += 4;
        return this.buffer.dataView.getFloat32(offset, LITTLE_ENDIAN);
    }

    public readFloat64 () : number {
        const offset = this.offset;
        this.offset += 8;
        return this.buffer.dataView.getFloat64(offset, LITTLE_ENDIAN);
    }

    public readString () : string {
        const byteLength = this.readUint32();
        const bytes = this.buffer.uint8.subarray(this.offset, this.offset + byteLength);
        this.offset += byteLength;
        return decodeString(bytes);
    }
}
