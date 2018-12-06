import test = require('tape');
import {
    MuVoid,
    MuBoolean,
    MuASCII,
    MuFixedASCII,
    MuUTF8,
    MuFloat32,
    MuFloat64,
    MuInt8,
    MuInt16,
    MuInt32,
    MuUint8,
    MuUint16,
    MuUint32,
    MuArray,
    MuSortedArray,
    MuDictionary,
    MuStruct,
    MuUnion,
    MuVector,
} from '../index';

test('schema.muType', (t) => {
    t.equal(new MuVoid().muType,        'void');
    t.equal(new MuBoolean().muType,     'boolean');
    t.equal(new MuASCII().muType,       'ascii');
    t.equal(new MuFixedASCII(1).muType, 'fixed-ascii');
    t.equal(new MuUTF8().muType,        'utf8');
    t.equal(new MuFloat32().muType,     'float32');
    t.equal(new MuFloat64().muType,     'float64');
    t.equal(new MuInt8().muType,        'int8');
    t.equal(new MuInt16().muType,       'int16');
    t.equal(new MuInt32().muType,       'int32');
    t.equal(new MuUint8().muType,       'uint8');
    t.equal(new MuUint16().muType,      'uint16');
    t.equal(new MuUint32().muType,      'uint32');
    t.equal(new MuArray(new MuFloat32()).muType,            'array');
    t.equal(new MuSortedArray(new MuFloat32()).muType,      'sorted-array');
    t.equal(new MuDictionary(new MuFloat32()).muType,       'dictionary');
    t.equal(new MuStruct({ f: new MuFloat32() }).muType,    'struct');
    t.equal(new MuUnion({ f: new MuFloat32() }).muType,     'union');
    t.equal(new MuVector(new MuFloat32(), 5).muType,        'vector');
    t.end();
});
