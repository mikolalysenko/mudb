import tape = require('tape');
import { HelWriteStream, HelReadStream } from '../_stream';
import { reallocBuffer, allocBuffer, freeBuffer } from '../_stream';

tape('int', function(t) {
  let ws = new HelWriteStream(16);
  ws.writeUint16(1024);
  ws.writeUint16(144);
  ws.writeUint8(128);
  
  let rs = new HelReadStream(ws.buffer.buffer);
  
  console.log(rs.readUint16());
  console.log(rs.readUint16());
  console.log(rs.readUint8());
  console.log('rs', rs);
  t.end();  
});

tape('fl64', function(t) {
  let ws = new HelWriteStream(16);
  ws.writeUint16(2018);
  ws.writeFloat64(1024.256);

  let rs = new HelReadStream(ws.buffer.buffer);

  console.log(rs.readUint16());
  console.log(rs.readFloat64());
  console.log(rs.buffer.uint8);
  console.log(rs.buffer.uint16);

  t.end();
});