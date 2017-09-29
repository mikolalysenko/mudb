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

import HelDict = require('../dictionary');

tape('dict', function (t) {
  // const Name = HelString('Bob');

  const FaceBook = HelDict(
    HelString('Name'),
    {
      ['Bob']: 'HelBob',
    });
  
  let rel = FaceBook.alloc();
  console.log('FaceBook', FaceBook);
  console.log('rel:', rel);
  console.log('>>>>>>>>>>>');
  const BookFace = HelDict(FaceBook);
  console.log('BookFace:', BookFace);
  let rel2 = BookFace.alloc();
  console.log('rel2:', rel2);

  t.end();
});

tape('dict-struct', function (t) {
  const NameNote = HelStruct({
    Name: HelString('Empty')
  });
  let name = NameNote.alloc();
  name.Name = 'Tom';
  const FaceBook = HelDict(
    NameNote,
    {
      ['Bob']: name,
    });
  console.log(FaceBook.alloc());
  t.end();
});
