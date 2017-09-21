import tape = require('tape');

import HelStruct from '../struct';

import HelInt8 from '../int8';
import HelInt16 from '../int16';
import HelInt32 from '../int32';

import HelUint8 from '../uint8';
import HelUint16 from '../uint16';
import HelUint32 from '../uint32';

import HelFloat32 from '../float32';
import HelFloat64 from '../float64';

import HelBoolean from '../boolean';

import HelString from '../string';

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
  console.log('Lua=',Lua , 'Ego=', Ego);
  console.log('patch:', Player.diff(Lua, Ego));
  t.end();
});