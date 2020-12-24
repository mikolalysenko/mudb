import * as test from 'tape';
import { MuWriteStream, MuReadStream } from '../';

test('new MuWriteStream()', (t) => {
    t.equal(new MuWriteStream(0).buffer.uint8.byteLength, 2);
    t.equal(new MuWriteStream(0.1).buffer.uint8.byteLength, 2);
    t.equal(new MuWriteStream(1).buffer.uint8.byteLength, 2);
    t.equal(new MuWriteStream(2).buffer.uint8.byteLength, 2);
    t.equal(new MuWriteStream(3).buffer.uint8.byteLength, 4);
    t.equal(new MuWriteStream(4).buffer.uint8.byteLength, 4);
    t.equal(new MuWriteStream(5).buffer.uint8.byteLength, 8);
    t.equal(new MuWriteStream(8).buffer.uint8.byteLength, 8);
    t.equal(new MuWriteStream(9).buffer.uint8.byteLength, 16);
    t.equal(new MuWriteStream(16).buffer.uint8.byteLength, 16);
    t.equal(new MuWriteStream(2 ** 30).buffer.uint8.byteLength, 2 ** 30);

    t.equal(new MuWriteStream(NaN).buffer.uint8.byteLength, 2);
    t.throws(() => new MuWriteStream(Infinity));
    t.throws(() => new MuWriteStream(-Infinity));
    t.throws(() => new MuWriteStream(-1));
    t.throws(() => new MuWriteStream(2 ** 30 + 1));
    t.end();
});

test('growing buffer', (t) => {
    const ws = new MuWriteStream(8);
    const oldBuffer = ws.buffer;

    ws.writeFloat64(1234.5678);
    ws.grow(0);

    t.equals(ws.buffer.buffer.byteLength, 8);
    t.equals(oldBuffer, ws.buffer, 'still the same buffer');

    ws.grow(1);

    t.equals(ws.buffer.buffer.byteLength, 16);
    t.notEquals(oldBuffer, ws.buffer, 'different buffer now');
    t.equals(ws.buffer.dataView.getFloat64(0, true), oldBuffer.dataView.getFloat64(0, true), 'but same content');

    t.end();
});

test('int', (t) => {
    const loops = 64;
    const ws = new MuWriteStream(0x1000);
    for (let i = -0x80; i < 0x80; i += 0x100 / loops) {
        ws.writeInt8(i);
        ws.writeInt8(i + 0x100 / loops - 1);
    }
    for (let i = -0x8000; i < 0x8000; i += 0x10000 / loops) {
        ws.writeInt16(i);
        ws.writeInt16(i + 0x10000 / loops - 1);
    }
    for (let i = -0x80000000; i < 0x80000000; i += 0x100000000 / loops) {
        ws.writeInt32(i);
        ws.writeInt32(i + 0x100000000 / loops - 1);
    }
    for (let i = 0; i < 0x100000000; i += 0x100000000 / loops) {
        ws.writeUint32(i);
        ws.writeUint32(i + 0x100000000 / loops - 1);
    }
    for (let i = 0; i < 0x10000; i += 0x10000 / loops) {
        ws.writeUint16(i);
        ws.writeUint16(i + 0x10000 / loops - 1);
    }
    for (let i = 0; i < 0x100; i += 0x100 / loops) {
        ws.writeUint8(i);
        ws.writeUint8(i + 0x100 / loops - 1);
    }

    const rs = new MuReadStream(ws.buffer.uint8);
    for (let i = -0x80; i < 0x80; i += 0x100 / loops) {
        t.equals(rs.readInt8(), i);
        t.equals(rs.readInt8(), i + 0x100 / loops - 1);
    }
    for (let i = -0x8000; i < 0x8000; i += 0x10000 / loops) {
        t.equals(rs.readInt16(), i);
        t.equals(rs.readInt16(), i + 0x10000 / loops - 1);
    }
    for (let i = -0x80000000; i < 0x80000000; i += 0x100000000 / loops) {
        t.equals(rs.readInt32(), i);
        t.equals(rs.readInt32(), i + 0x100000000 / loops - 1);
    }
    for (let i = 0; i < 0x100000000; i += 0x100000000 / loops) {
        t.equals(rs.readUint32(), i);
        t.equals(rs.readUint32(), i + 0x100000000 / loops - 1);
    }
    for (let i = 0; i < 0x10000; i += 0x10000 / loops) {
        t.equals(rs.readUint16(), i);
        t.equals(rs.readUint16(), i + 0x10000 / loops - 1);
    }
    for (let i = 0; i < 0x100; i += 0x100 / loops) {
        t.equals(rs.readUint8(), i);
        t.equals(rs.readUint8(), i + 0x100 / loops - 1);
    }

    t.end();
});

test('float', (t) => {
    const FLOAT32_EPSILON = 1.401298464324817e-45;
    const FLOAT32_MIN = 1.1754943508222875e-38;
    const FLOAT32_MAX = 3.4028234663852886e+38;
    const FLOAT64_EPSILON = 5e-324;
    const FLOAT64_MIN = 2.2250738585072014e-308;
    const FLOAT64_MAX = 1.7976931348623157e+308;

    const ws = new MuWriteStream(0x100);

    const floatNum = Math.random();

    ws.writeFloat32(FLOAT32_MIN);
    ws.writeFloat32(-FLOAT32_EPSILON);
    ws.writeFloat32(0);
    ws.writeFloat32(FLOAT32_EPSILON);
    ws.writeFloat32(FLOAT32_MAX);
    ws.writeFloat32(floatNum);
    ws.writeFloat64(FLOAT64_MIN);
    ws.writeFloat64(-FLOAT64_EPSILON);
    ws.writeFloat64(0);
    ws.writeFloat64(FLOAT64_EPSILON);
    ws.writeFloat64(FLOAT64_MAX);
    ws.writeFloat64(floatNum);

    const fround = (function (a) {
        return function (n:number) : number {
            a[0] = n;
            return a[0];
        };
    })(new Float32Array(1));

    const rs = new MuReadStream(ws.buffer.uint8);

    t.equals(rs.readFloat32(), FLOAT32_MIN);
    t.equals(rs.readFloat32(), -FLOAT32_EPSILON);
    t.equals(rs.readFloat32(), 0);
    t.equals(rs.readFloat32(), FLOAT32_EPSILON);
    t.equals(rs.readFloat32(), FLOAT32_MAX);
    t.equals(rs.readFloat32(), fround(floatNum));
    t.equals(rs.readFloat64(), FLOAT64_MIN);
    t.equals(rs.readFloat64(), -FLOAT64_EPSILON);
    t.equals(rs.readFloat64(), 0);
    t.equals(rs.readFloat64(), FLOAT64_EPSILON);
    t.equals(rs.readFloat64(), FLOAT64_MAX);
    t.equals(rs.readFloat64(), floatNum);

    t.end();
});

test('ascii string', (t) => {
    const asciis = new Array(128);
    for (let i = 0; i < 128; ++i) {
        asciis[i] = String.fromCharCode(i);
    }

    let ws = new MuWriteStream(1024);

    ws.writeUint32(0);
    ws.writeASCII('');

    for (let i = 0; i < 128; ++i) {
        ws.writeUint32(1);
        ws.writeASCII(asciis[i]);
    }

    let rs = new MuReadStream(ws.buffer.uint8);

    let strLeng = rs.readUint32();
    t.equals(rs.readASCII(strLeng), '');

    for (let i = 0; i < 128; ++i) {
        strLeng = rs.readUint32();
        t.equals(rs.readASCII(strLeng), asciis[i]);
    }

    let longStr = '';
    const str = asciis.join('');
    for (let i = 0; i < 1e5; ++i) {
        longStr += str;
    }

    ws = new MuWriteStream(2 ** 30);
    ws.writeUint32(longStr.length);
    ws.writeASCII(longStr);

    rs = new MuReadStream(ws.buffer.uint8);
    strLeng = rs.readUint32();

    t.equals(rs.readASCII(strLeng), longStr);

    t.end();
});

test('string', (t) => {
    const emptyStr = '';
    const strA = String.fromCharCode(0x00, 0x00, 0x00, 0x00,
                                     0x00, 0x00, 0x00, 0x00);
    const strB = String.fromCharCode(0x12, 0x34, 0x00, 0x00,
                                     0x00, 0x00, 0x00, 0x00);
    const strC = String.fromCharCode(0x12, 0x34, 0x56, 0x78,
                                     0x87, 0x65, 0x43, 0x21);
    const strD = String.fromCharCode(0xFF, 0xFF, 0xFF, 0xFF,
                                     0xFF, 0xFF, 0xFF, 0xFF);

    let ws = new MuWriteStream(128);
    ws.writeString('');
    ws.writeString(strA);
    ws.writeString(strB);
    ws.writeString(strC);
    ws.writeString(strD);
    let rs = new MuReadStream(ws.buffer.uint8);

    t.equals(rs.readString(), '');
    t.equals(rs.readString(), strA);
    t.equals(rs.readString(), strB);
    t.equals(rs.readString(), strC);
    t.equals(rs.readString(), strD);

    const ascii = 'I <3 you.';
    const twoBytes = 'אני אוהבת אותך';
    const threeBytes = '我♥你';
    const fourBytes = '👩👨❤️👨👩';

    ws = new MuWriteStream(256);
    ws.writeString(ascii);
    ws.writeString(twoBytes);
    ws.writeString(threeBytes);
    ws.writeString(fourBytes);

    rs = new MuReadStream(ws.buffer.uint8);

    t.equals(rs.readString(), ascii);
    t.equals(rs.readString(), twoBytes);
    t.equals(rs.readString(), threeBytes);
    t.equals(rs.readString(), fourBytes);

    const varBytes = fourBytes + twoBytes + ascii + threeBytes;
    let longStr = '';
    for (let i = 0; i < 100000; ++i) {
        longStr += varBytes;
    }

    ws = new MuWriteStream(2 ** 30);
    ws.writeString(longStr);

    rs = new MuReadStream(ws.buffer.uint8);

    t.equals(rs.readString(), longStr, 'able to write and read a long string of characters of various bytes');

    t.end();
});

test('varints', (t) => {
    const testVals = [
        1,
        64,
        128,
        129,
        255,
        256,
        (1 << 7),
        (1 << 14),
        (1 << 21),
        (1 << 28),
        (1 << 31),
    ];

    for (let i = testVals.length - 1; i >= 0; --i) {
        const x = testVals[i];
        testVals.push(
            (x - 1) >>> 0,
            (x + 1) >>> 0,
            (x + (Math.random() * x) | 0) >>> 0);
    }

    testVals.push(0);
    testVals.push(0xfffffff);

    const ws = new MuWriteStream(5 * testVals.length);
    for (let i = 0; i < testVals.length; ++i) {
        ws.writeVarint(testVals[i]);
    }

    const rs = new MuReadStream(ws.bytes());
    for (let i = 0; i < testVals.length; ++i) {
        t.equals(rs.readVarint(), testVals[i] >>> 0, 'var int read ok: 0b' + (testVals[i] >>> 0).toString(2));
    }

    t.end();
});

test('stream offset & length', (t) => {
    const ws = new MuWriteStream(8);
    ws.offset += 8;
    const rs0 = new MuReadStream(ws.bytes());
    t.equals(rs0.offset, 0);
    t.equals(rs0.length, 8);
    rs0.readFloat32();
    const rs1 = new MuReadStream(rs0.bytes());
    t.equals(rs1.offset, 4);
    t.equals(rs1.length, 8);
    t.end();
});

test('checking bounds', (t) => {
{
    const ws = new MuWriteStream(1);
    ws.offset += 1;
    const rs = new MuReadStream(ws.bytes());
    t.doesNotThrow(() => rs.readInt8());
    t.throws(() => rs.readInt8());
}
{
    const ws = new MuWriteStream(1);
    ws.offset += 1;
    const rs = new MuReadStream(ws.bytes());
    t.doesNotThrow(() => rs.readUint8());
    t.throws(() => rs.readUint8());
}
{
    const ws = new MuWriteStream(2);
    ws.offset += 2;
    const rs = new MuReadStream(ws.bytes());
    t.doesNotThrow(() => rs.readInt16());
}
{
    const ws = new MuWriteStream(2);
    ws.offset += 1;
    const rs = new MuReadStream(ws.bytes());
    t.throws(() => rs.readInt16());
}
{
    const ws = new MuWriteStream(2);
    ws.offset += 2;
    const rs = new MuReadStream(ws.bytes());
    t.doesNotThrow(() => rs.readUint16());
}
{
    const ws = new MuWriteStream(2);
    ws.offset += 1;
    const rs = new MuReadStream(ws.bytes());
    t.throws(() => rs.readUint16());
}
{
    const ws = new MuWriteStream(4);
    ws.offset += 4;
    const rs = new MuReadStream(ws.bytes());
    t.doesNotThrow(() => rs.readInt32());
}
{
    const ws = new MuWriteStream(4);
    ws.offset += 3;
    const rs = new MuReadStream(ws.bytes());
    t.throws(() => rs.readInt32());
}
{
    const ws = new MuWriteStream(4);
    ws.offset += 4;
    const rs = new MuReadStream(ws.bytes());
    t.doesNotThrow(() => rs.readUint32());
}
{
    const ws = new MuWriteStream(4);
    ws.offset += 3;
    const rs = new MuReadStream(ws.bytes());
    t.throws(() => rs.readUint32());
}
{
    const ws = new MuWriteStream(4);
    ws.offset += 4;
    const rs = new MuReadStream(ws.bytes());
    t.doesNotThrow(() => rs.readFloat32());
}
{
    const ws = new MuWriteStream(4);
    ws.offset += 3;
    const rs = new MuReadStream(ws.bytes());
    t.throws(() => rs.readFloat32());
}
{
    const ws = new MuWriteStream(8);
    ws.offset += 8;
    const rs = new MuReadStream(ws.bytes());
    t.doesNotThrow(() => rs.readFloat64());
}
{
    const ws = new MuWriteStream(8);
    ws.offset += 7;
    const rs = new MuReadStream(ws.bytes());
    t.throws(() => rs.readFloat64());
}
{
    const ws = new MuWriteStream(5);
    ws.writeVarint(0x7f);
    ws.offset -= 1;
    const rs = new MuReadStream(ws.bytes());
    t.throws(() => rs.readVarint());
}
{
    const ws = new MuWriteStream(5);
    ws.writeVarint(0x3fff);
    ws.offset -= 1;
    const rs = new MuReadStream(ws.bytes());
    t.throws(() => rs.readVarint());
}
{
    const ws = new MuWriteStream(5);
    ws.writeVarint(0x1fffff);
    ws.offset -= 1;
    const rs = new MuReadStream(ws.bytes());
    t.throws(() => rs.readVarint());
}
{
    const ws = new MuWriteStream(5);
    ws.writeVarint(0xfffffff);
    ws.offset -= 1;
    const rs = new MuReadStream(ws.bytes());
    t.throws(() => rs.readVarint());
}
{
    const ws = new MuWriteStream(5);
    ws.writeVarint(0xffffffff);
    ws.offset -= 1;
    const rs = new MuReadStream(ws.bytes());
    t.throws(() => rs.readVarint());
}
{
    const ws = new MuWriteStream(5);
    const s = 'a';
    ws.writeVarint(s.length + 1);
    ws.writeASCII(s);
    const rs = new MuReadStream(ws.bytes());
    t.throws(() => rs.readASCII(rs.readVarint()));
}
{
    const ws = new MuWriteStream(128);
    ws.writeString('Iñtërnâtiônàlizætiøn☃💩');
    ws.offset -= 1;
    const rs = new MuReadStream(ws.bytes());
    t.throws(() => rs.readString());
}
t.end();
});
