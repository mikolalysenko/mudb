import * as test from 'tape';
import { MuWriteStream, MuReadStream } from '../';
import { reallocBuffer, allocBuffer, freeBuffer } from '../';

test('buffer allocation', (t) => {
  t.equals(allocBuffer(8).buffer.byteLength, 8);
  t.equals(allocBuffer(9).buffer.byteLength, 16);
  t.equals(allocBuffer(15).buffer.byteLength, 16);

  t.end();
});

test('int', (t) => {
  let ws = new MuWriteStream(8);
  ws.writeUint32(1234567890);
  ws.writeUint16(12345);
  ws.writeUint8(123);

  let rs = new MuReadStream(ws.buffer.buffer);

  t.equals(rs.readUint32(), 1234567890);
  t.equals(rs.readUint16(), 12345);
  t.equals(rs.readUint8(), 123);

  ws = new MuWriteStream(8);
  ws.writeUint8(255);
  ws.writeUint16(65535);
  ws.writeUint32(4294967295);

  rs = new MuReadStream(ws.buffer.buffer);

  t.equals(rs.readUint32(), 4294967295);
  t.equals(rs.readUint16(), 65535);
  t.equals(rs.readUint8(), 255);

  ws = new MuWriteStream(8);
  ws.writeUint8(256);
  ws.writeUint16(65536);
  ws.writeUint32(4294967296);

  rs = new MuReadStream(ws.buffer.buffer);

  t.equals(rs.readUint8(), 0);
  t.equals(rs.readUint16(), 0);
  t.equals(rs.readUint32(), 0);

  t.end();
});

test('float64', (t) => {
  let ws = new MuWriteStream(16);
  ws.writeFloat64(1024.256);
  ws.writeUint16(2018);

  let rs = new MuReadStream(ws.buffer.buffer);

  t.equals(rs.readFloat64(), 1024.256);
  t.equals(rs.readUint16(), 2018);

  ws = new MuWriteStream(16);

  ws.writeUint16(2018);
  ws.writeFloat64(1024.256);

  rs = new MuReadStream(ws.buffer.buffer);

  t.equals(rs.readUint16(), 2018);
  t.equals(rs.readFloat64(), 1024.256);

  t.end();
});
