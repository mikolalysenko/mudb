# stream
TypedArray-based, growable stream API, using buffer pooling to minimize GC

## example
```javascript
const { MuWriteStream, MuReadStream } = require('mudb/stream')

// initialize a write stream
const initialSize = 4
const inp = new MuWriteStream(initialSize)

// write stuff to it
const prop = 'hp'
inp.writeVarint(prop.length)
inp.writeASCII(prop)
inp.writeUint8(100)

// if you're not sure whether the stream has enough space for the data coming in,
// you should grow the stream before you write to it.  it's ok to over grow a bit
inp.grow(60)
inp.writeString('半分しか食べてないままで捨てちゃダメ')

// get the data written to the stream so far, which can then be transferred over
// the Internet or whatever
const data = inp.bytes()

// remember to destroy the stream
inp.destroy()

// assume we receive the data at another endpoint
const out = new MuReadStream(data)

// you can retrieve data in the order as they were written
const propLeng = out.readVarint()
out.readASCII(propLeng) // 'hp'
out.readUint8()         // 100
out.readString()        // '半分しか食べてないままで捨てちゃダメ'
```

## API
* [MuWriteStream](#muwritestream)
* [MuReadStream](#mureadstream)
* [MuBuffer](#mubuffer)

Generally, data written by `writeX()` is meant be read by the corresponding `readX()`.  All `writeX()` and `readX()` methods set/get the data at the position marked by `stream.offset` and then increment it.  While `writeXAt()` and `readXAt()` set/get the data at the specified position, and don't alter the value of `stream.offset`.

### usage tips
* remember to destroy the stream after using it, doing so can help reduce GC, which in turn leads to better performance
* try to reduce the calls to `grow()` when possible
* prefer the use of `writeVarint()` over variants like `writeUint32()` when the values can be large and small, it may save you some bytes

### MuWriteStream
Provides a set of methods to write different types of data to the buffer.

### `new MuWriteStream(capacity)`
* `capacity` *number* initial size of the stream

### `writeStream.buffer`
* *[MuBuffer](#mubuffer)* a handy wrapper of the underlying buffer

### `writeStream.offset`
* *number* pointer that marks where data will be written by a write method

Generally, you shouldn't have to deal with this property directly.

### `writeStream.grow(size)`
* `size` *number* increment to the size of the buffer

Ensures there will be at least `size` bytes available in the buffer.

### `writeStream.bytes()`
* return *Uint8Array* data buffered so far

More specifically, it returns a copy of a slice of the buffer, from the start to the index marked by the pointer.

### `writeStream.destroy()`
You SHOULD call this method after using the stream, to pool the buffer.

### `writeStream.writeUint8(num)`
* `num` should be in the range [0, 255] in order to get the correct result

Writes the number as a uint8 to the buffer and increments the pointer.  Methods below share similar behavior.

### `writeStream.writeUint16(num)`
* `num` in [0, 65535]

### `writeStream.writeUint32(num)`
* `num` in [0, 4294967295]

### `writeStream.writeInt8(num)`
* `num` in [-128, 127]

### `writeStream.writeInt16(num)`
* `num` in [-32768, 32767]

### `writeStream.writeInt32(num)`
* `num` in [-2147483648, 2147483647]

### `writeStream.writeFloat32(num)`
* `num` absolute value of which should be in [1.2e-38, 3.4e38] (7 significant digits)

### `writeStream.writeFloat64(num)`
* `num` absolute value of which should be in [5.0e-324, 1.8e308] (15 significant digits)

### `writeStream.writeVarint(num)`
* `num` in [0, 4294967295]

For the encoding format, see the [FLIF specification](https://flif.info/spec.html#_part_1_main_header).

### `writeStream.writeASCII(str)`
* `str` should be a string composed of only ASCII characters

You MUST keep track of the string length yourself, like writing the length along with the string into the buffer as the example shows.

### `writeStream.writeString(str)`
* `str` can be a string composed of any Unicode characters

Unlike `writeASCII()`, `writeString()` keeps track of the string length for you.

### `writeStream.writeUint8At(offset, num)`
* `offset` *number* index to write to
* `num` in [0, 255]

Unlike `writeUint8()`, this method writes to the specified position and doesn't increment the pointer.

### `writeStream.writeUint32At(offset, num)`
* `offset` *number* index to write to
* `num` in [0, 4294967295]

Unlike `writeUint32()`, this method writes to the specified position and doesn't increment the pointer.

### MuReadStream
Provides a set of read methods to read different types of data from the buffer.

### `new MuReadStream(bytes)`
* `bytes` *Uint8Array* normally created by `writeStream.bytes()`

### `readStream.buffer`
* *[MuBuffer](#mubuffer)* handy wrapper of the underlying buffer

### `readStream.length`
* *number* byte length of the buffer

### `readStream.offset`
* *number* pointer that marks where data will be read from by a read method

### `readStream.bytes()`
* return *Uint8Array* unread data on the buffer

### `readStream.checkBounds()`
Checks the pointer, throws if it's out of bounds.

### `readStream.readUint8()`
* return *number*

Reads a number as uint8 from the buffer and increments the pointer.  Methods below share similar behavior.

### `readStream.readUint16()`
* return *number*

### `readStream.readUint32()`
* return *number*

### `readStream.readInt8()`
* return *number*

### `readStream.readInt16()`
* return *number*

### `readStream.readInt32()`
* return *number*

### `readStream.readFloat32()`
* return *number*

### `readStream.readFloat64()`
* return *number*

### `readStream.readVarint()`
* return *number*

### `readStream.readASCII(length)`
* `length` *number* how many ascii characters to read from the buffer
* return *string*

### `readStream.readString()`
* return *string*

Unlike `readASCII()`, you don't need to worry about the length of the string.

### `readStream.readUint8At(offset)`
* `offset` *number* index to read from
* return *number*

Unlike `readUint8()`, this method reads from the specified position and doesn't increment the pointer.

### MuBuffer
A handy wrapper cumulating different views over the underlying `ArrayBuffer`.

### `new MuBuffer(buffer)`
* `buffer` *ArrayBuffer*

### `buffer.buffer`
* *ArrayBuffer* reference to the underlying buffer

### `buffer.dataView`
* *DataView* view over the underlying buffer

### `buffer.uint8`
* *Uint8Array* view over the underlying buffer

## ideas
* bulk access to the internal buffer

## credits
Copyright (c) 2017 Mikola Lysenko, Shenzhen Dianmao Technology Company Limited
