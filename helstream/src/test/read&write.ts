import tape = require('tape');
import WS = require('..');
import RS = require('..');
import { reallocBuffer, allocBuffer, freeBuffer } from '../stream';

tape('write&read', function(t) {
  let ws = WS(16);
  ws.writeUint16(1024);
  ws.writeUint16(144);
  ws.writeUint8(128);
  
  let rs = RS(16);
  rs.buffer = reallocBuffer(ws.buffer, 16);
  
  console.log(rs.readUint16());
  console.log(rs.readUint16());
  console.log(rs.readUint8());
  t.end();  
});

tape('fl64', function(t) {
  let ws = WS(64);
  ws.writeFloat64(1024.256);

  let rs = RS(64);
  rs.buffer = reallocBuffer(ws.buffer, 64);

  console.log(rs.readFloat64());
  t.end();
});