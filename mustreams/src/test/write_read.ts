import * as test from 'tape';
import { MuWriteStream, MuReadStream } from '../';
import { reallocBuffer, allocBuffer, freeBuffer } from '../';

import StringCodec = require('../string');

const {
    encodeString,
    decodeString,
} = StringCodec;

test('buffer allocation', (t) => {
    t.equals(allocBuffer(8).buffer.byteLength, 8);
    t.equals(allocBuffer(9).buffer.byteLength, 16);
    t.equals(allocBuffer(15).buffer.byteLength, 16);

    t.end();
});

test('buffer reallocation', (t) => {
    const ws = new MuWriteStream(8);

    t.equals(ws.buffer.uint8.byteLength, 8);

    ws.writeFloat64(1234.5678);
    ws.grow(8);

    const rs = new MuReadStream(ws.buffer);

    t.equals(ws.buffer.uint8.byteLength, 16);
    t.equals(rs.readFloat64(), 1234.5678);

    t.end();
});

test('int', (t) => {
    const ws = new MuWriteStream(64);
    ws.writeInt32(1234567890);
    ws.writeUint32(2345678901);
    ws.writeInt16(12345);
    ws.writeUint16(23456);
    ws.writeInt8(123);
    ws.writeUint8(234);

    const rs = new MuReadStream(ws.buffer);

    t.equals(rs.readInt32(), 1234567890);
    t.equals(rs.readUint32(), 2345678901);
    t.equals(rs.readInt16(), 12345);
    t.equals(rs.readUint16(), 23456);
    t.equals(rs.readInt8(), 123);
    t.equals(rs.readUint8(), 234);

    ws.writeUint8(255);
    ws.writeUint16(65535);
    ws.writeUint32(4294967295);
    ws.writeInt32(2147483647);
    ws.writeInt16(32767);
    ws.writeInt8(127);

    t.equals(rs.readUint8(), 255);
    t.equals(rs.readUint16(), 65535);
    t.equals(rs.readUint32(), 4294967295);
    t.equals(rs.readInt32(), 2147483647);
    t.equals(rs.readInt16(), 32767);
    t.equals(rs.readInt8(), 127);

    ws.writeInt8(128);
    ws.writeInt16(32768);
    ws.writeInt32(2147483648);
    ws.writeUint8(256);
    ws.writeUint16(65536);
    ws.writeUint32(4294967296);

    t.equals(rs.readInt8(), -128);
    t.equals(rs.readInt16(), -32768);
    t.equals(rs.readInt32(), -2147483648);
    t.equals(rs.readUint8(), 0);
    t.equals(rs.readUint16(), 0);
    t.equals(rs.readUint32(), 0);

    t.end();
});

test('float', (t) => {
    const ws = new MuWriteStream(64);
    ws.writeFloat64(128.2097152);
    ws.writeFloat64(256.16777216);
    ws.writeFloat32(1234.56);

    const rs = new MuReadStream(ws.buffer);

    t.equals(rs.readFloat64(), 128.2097152);
    t.equals(rs.readFloat64(), 256.16777216);
    t.equals(rs.readFloat32(), toFloat32(1234.56));

    ws.writeUint16(2018);
    ws.writeFloat32(1234.56);
    ws.writeFloat64(2048.8589934592);
    ws.writeFloat64(1024.1073741824);

    t.equals(rs.readUint16(), 2018);
    t.equals(rs.readFloat32(), toFloat32(1234.56));
    t.equals(rs.readFloat64(), 2048.8589934592);
    t.equals(rs.readFloat64(), 1024.1073741824);

    t.end();
});

function toFloat32(x:number) {
    const f = new Float32Array(1);
    f[0] = x;
    return f[0];
}

test('string', (t) => {
    const ws = new MuWriteStream(128);
    ws.writeString('');
    ws.writeString('Hello 你好 здравствуйте');
    ws.writeString('𐌀𐌁𐌂𐌃𐌄𐌅𐌆𐌇𐌈𐌉𐌊𐌋𐌌');

    const rs = new MuReadStream(ws.buffer);

    t.equals(rs.readString(), '');
    t.equals(rs.readString(), 'Hello 你好 здравствуйте');
    t.equals(rs.readString(), '𐌀𐌁𐌂𐌃𐌄𐌅𐌆𐌇𐌈𐌉𐌊𐌋𐌌');

    t.end();
});
