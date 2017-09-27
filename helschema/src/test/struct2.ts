import tape = require('tape');

import HelStruct = require('../struct');

import HelInt8 = require('../int8');
import HelInt16 = require('../int16');
import HelInt32 = require('../int32');

import HelUint8 = require('../uint8');
import HelUint16 = require('../uint16');
import HelUint32 = require('../uint32');

import HelFloat32 = require('../float32');
import HelFloat64 = require('../float64');

import HelBoolean = require('../boolean');

import HelString = require('../string');

tape('struct', function (t) {
  const HandleItem = HelStruct({
    category: HelString('food'),
    energy: HelInt8(100),
  });

  const Player = HelStruct({
    x: HelFloat64(12),
    y: HelFloat64(25),
    isRunning: HelBoolean(),
    item: HandleItem,
  });

  const Lua = Player.alloc();
  const Ego = Player.alloc();
  Lua.item.energy = 80;
  Lua.isRunning = true;
  console.log('Lua=',Lua);
  console.log('Ego=', Ego);
  console.log('patch:', Player.diff(Lua, Ego));
  t.end();
});