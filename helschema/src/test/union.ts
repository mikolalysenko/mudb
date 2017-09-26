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

import HelUnion = require('../union');

// tape('union [1]', function (t) {
//   const TxtNum = HelUnion({
//     text: HelString('abcd'),
//     number: HelInt32(120),
//   });
//   console.log('TxtNum', TxtNum);
//   let target = TxtNum.alloc();
//   let base = TxtNum.alloc();
//   base.type = 'text';
//   base.data = 'Name';
//   console.log('target:', target);
//   console.log('base:', base);
//   let patch_2 = TxtNum.diff(base, target);
//   console.log('patch_2:', patch_2);

//   // let patch_1 = TxtNum.diff(target, base);
//   // console.log('patch_1:', patch_1);
//   // target = TxtNum.patch(target, patch_1);
//   // console.log('target:', target);

  
//   t.end();
// });

tape('union [2]', function (t) {
  const TxtNum = HelUnion({
    text: HelString('abcd'),
    number: HelInt32(120),
  }, 'number', HelInt32(320).alloc());
  console.log('TxtNum', TxtNum);
  let target = TxtNum.alloc();
  let base = TxtNum.alloc();
  base.type = 'text';
  base.data = 'Name';
  console.log('target:', target);
  console.log('base:', base);
  let patch_2 = TxtNum.diff(base, target);
  console.log('patch_2:', patch_2);

  t.end();
});
