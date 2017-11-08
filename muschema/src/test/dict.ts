import test = require('tape');

import {
  MuStruct,
  MuBoolean,
  MuFloat32,
  MuFloat64,
  MuUint8,
  MuUint16,
  MuInt32,
  MuString,
  MuUnion,
  MuDictionary,
} from '../index';

test('dict', function (t) {
  // const Name = HelString('Bob');

  const FaceBook = new MuDictionary(
    new MuString('Name'),
    {
      ['Bob']: 'HelBob',
    });

  let rel = FaceBook.alloc();
  console.log('FaceBook', FaceBook);
  console.log('rel:', rel);
  console.log('>>>>>>>>>>>');
  const BookFace = new MuDictionary(FaceBook);
  console.log('BookFace:', BookFace);
  let rel2 = BookFace.alloc();
  console.log('rel2:', rel2);

  t.end();
});

test('dict-struct', function (t) {
  const NameNote = new MuStruct({
    Name: new MuString('Empty'),
  });
  let name = NameNote.alloc();
  name.Name = 'Tom';
  const FaceBook = new MuDictionary(
    NameNote,
    {
      ['Bob']: name,
    });
  console.log(FaceBook.alloc());
  t.end();
});
