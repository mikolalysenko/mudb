import test = require('tape');

import {
  MuStruct,
  MuInt8,
  MuInt16,
  MuInt32,
  MuUint8,
  MuUint16,
  MuUint32,
  MuFloat32,
  MuFloat64,
  MuBoolean,
  MuString,
} from '../index';

test('struct', function (t) {
  const HandleItem = new MuStruct({
    category: new MuString('food'),
    energy: new MuInt8(100),
  });

  const Player = new MuStruct({
    x: new MuFloat64(12),
    y: new MuFloat64(25),
    isRunning: new MuBoolean(),
    item: HandleItem,
  });

  const Lua = Player.alloc();
  const Ego = Player.alloc();
  Lua.item.energy = 80;
  Lua.isRunning = true;
  console.log('Lua=', Lua);
  console.log('Ego=', Ego);
  console.log('patch:', Player.diff(Lua, Ego));
  t.end();
});
