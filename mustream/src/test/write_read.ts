import * as test from 'tape';
import { MuWriteStream, MuReadStream } from '../';
import { reallocBuffer, allocBuffer, freeBuffer } from '../';

test('int', (t) => {
  const ws = new MuWriteStream(16);
  ws.writeUint16(1024);
  ws.writeUint16(144);
  ws.writeUint8(128);

  const rs = new MuReadStream(ws.buffer.buffer);

  t.equal(rs.readUint16(), 1024);
  t.equal(rs.readUint16(), 144);
  t.equal(rs.readUint8(), 128);

  t.end();
});

test('float64', (t) => {
  const ws = new MuWriteStream(16);
  ws.writeUint16(2018);
  ws.writeFloat64(1024.256);

  const rs = new MuReadStream(ws.buffer.buffer);

  t.equal(rs.readUint16(), 2018);
  t.equal(rs.readFloat64(), 1024.256);

  t.end();
});
