import test = require('tape');

import {
  MuStruct,
  MuInt8,
  MuInt16,
  MuInt32,
  MuUint8,
  MuUint16,
  MuUint32,
  MuBoolean,
  MuString,
  MuFloat32,
  MuFloat64,
  MuUnion,
} from '../index';

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

test('union [2]', function (t) {
  const TxtNum = new MuUnion({
    text: new MuString('abcd'),
    number: new MuInt32(120),
  }, 'number');
  console.log('TxtNum', TxtNum);
  let target = TxtNum.alloc();
  let base = TxtNum.alloc();
  base.type = 'text';
  base.data = 'Name';
  console.log('target:', target);
  console.log('base:', base);
  let patch_2 = TxtNum.diff(target, base);
  console.log('patch_2:', patch_2);

  t.end();
});
