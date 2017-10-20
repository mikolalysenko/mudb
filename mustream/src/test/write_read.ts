import * as test from 'tape';
import { MuWriteStream, MuReadStream } from '../';
import { reallocBuffer, allocBuffer, freeBuffer } from '../';

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

  t.equals(ws.buffer.uint8.byteLength, 16);

  t.end();
});

test('int', (t) => {
  let ws = new MuWriteStream(16);
  ws.writeInt32(1234567890);
  ws.writeUint32(2345678901);
  ws.writeInt16(12345);
  ws.writeUint16(23456);
  ws.writeInt8(123);
  ws.writeUint8(234);

  let rs = new MuReadStream(ws.buffer.buffer);

  t.equals(rs.readInt32(), 1234567890);
  t.equals(rs.readUint32(), 2345678901);
  t.equals(rs.readInt16(), 12345);
  t.equals(rs.readUint16(), 23456);
  t.equals(rs.readInt8(), 123);
  t.equals(rs.readUint8(), 234);

  ws = new MuWriteStream(16);
  ws.writeUint8(255);
  ws.writeUint16(65535);
  ws.writeUint32(4294967295);
  ws.writeInt32(2147483647);
  ws.writeInt16(32767);
  ws.writeInt8(127);

  rs = new MuReadStream(ws.buffer.buffer);

  t.equals(rs.readUint32(), 4294967295);
  t.equals(rs.readUint16(), 65535);
  t.equals(rs.readUint8(), 255);

  ws = new MuWriteStream(16);
  ws.writeInt8(128);
  ws.writeInt16(32768);
  ws.writeInt32(2147483648);
  ws.writeUint8(256);
  ws.writeUint16(65536);
  ws.writeUint32(4294967296);

  rs = new MuReadStream(ws.buffer.buffer);

  t.equals(rs.readInt8(), -128);
  t.equals(rs.readInt16(), -32768);
  t.equals(rs.readInt32(), -2147483648);
  t.equals(rs.readUint8(), 0);
  t.equals(rs.readUint16(), 0);
  t.equals(rs.readUint32(), 0);

  t.end();
});

test('float', (t) => {
  let ws = new MuWriteStream(32);
  ws.writeFloat64(1024.256);
  ws.writeFloat64(2048.512);
  ws.writeFloat32(1234.56);
  ws.writeUint16(2017);

  let rs = new MuReadStream(ws.buffer.buffer);

  t.equals(rs.readFloat64(), 1024.256);
  t.equals(rs.readFloat64(), 2048.512);
  t.equals(rs.readFloat32().toFixed(2), '1234.56');
  t.equals(rs.readUint16(), 2017);

  ws = new MuWriteStream(32);
  ws.writeUint16(2018);
  ws.writeFloat64(2048.512);
  ws.writeFloat32(1234.56);
  ws.writeFloat64(1024.256);

  rs = new MuReadStream(ws.buffer.buffer);

  t.equals(rs.readUint16(), 2018);
  t.equals(rs.readFloat64(), 2048.512);
  t.equals(rs.readFloat32().toFixed(2), '1234.56');
  t.equals(rs.readFloat64(), 1024.256);

  t.end();
});
