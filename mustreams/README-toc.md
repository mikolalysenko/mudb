# mustream
Binary stream API for mudb.  It is different from the Stream API of Node.js in that

- all streams of this API operate on typed arrays
- it provides built-in buffer pooling to help you minimize garbage collection

**WIP**

# table of contents

# install #

```
npm i mustreams
```

# api #

The methods of `MuWriteStream` and `MuReadStream` are closely related so they are meant to be used together.

## `MuWriteStream(bufferCapacity:number)` ##
An interface through which you can buffer different types of data.

### `buffer:MuBuffer` ###
A wrapper object providing access to the internal buffer.

### `offset:number` ###
The offset in bytes from the start of the internal buffer which marks the position where the data will be written.  The value of `offset` is automatically incremented whenever you write to the stream.

### `bytes() : Uint8Array` ###
Creates a copy of a portion of the internal buffer, from the start to the position marked by `offset`.

### `grow(numBytes:number)` ###
Increases the size of the internal buffer by a number of bytes.  The resulted buffer size will always be a power of 2.

### `destroy()` ###
Pools `this.buffer`.

### `writeInt8(i:number)` ###
Buffers a signed 8-bit integer ranging from -128 to 127.

### `writeInt16(i:number)` ###
Buffers a signed 16-bit integer ranging from -32768 to 32767.

### `writeInt32(i:number)` ###
Buffers a signed 32-bit integer ranging from -2147483648 to 2147483647.

### `writeUint8(i:number)` ###
Buffers an unsigned 8-bit integer ranging from 0 to 255.

### `writeUint16(i:number)` ###
Buffers an unsigned 16-bit integer ranging from 0 to 65535.

### `writeUint32(i:number)` ###
Buffers an unsigned 32-bit integer ranging from 0 to 4294967295.

### `writeVarInt(i:number)` ###
Buffers an unsigned integer ranging from 0 to 4294967295.  The number of bytes used to store `i` varies by the value.  So unlike other write methods, `writeVarInt()` uses no more space than it is required to store `i`.

### `writeFloat32(f:number)` ###
Buffers a signed 32-bit float number whose absolute value ranging from 1.2e-38 to 3.4e38, with 7 significant digits.

### `writeFloat64(f:number)` ###
Buffers a signed 64-bit float number whose absolute value ranging from 5.0e-324 to 1.8e308, with 15 significant digits.

### `writeASCII(s:string)` ###
Buffers a string composed of only ASCII characters.

### `writeString(s:string)` ###
Buffers a string which may contain non-ASCII characters.

### `writeUint8At(offset:number, i:number)` ###
Similar to `writeUint8()` except it writes the integer at the position marked by the specified offset.  Note that unlike other write methods, this method will not increment the value of `offset`.

## `MuReadStream(data:Uint8Array)` ##
An interface through which you can retrieve different types of data from the buffer.

### `buffer:MuBuffer` ###
A wrapper object providing access to the internal buffer.

### `offset:number` ###
The offset in bytes from the start of the internal buffer which marks the position the data will be read from.  The value of `offset` is automatically incremented whenever you read from the stream.

### `length:number` ###

### `readInt8() : number` ###
Reads a signed 8-bit integer from buffer.

### `readInt16() : number` ###
Reads a signed 16-bit integer from buffer.

### `readInt32() : number` ###
Reads a signed 32-bit integer from buffer.

### `readUint8() : number` ###
Reads a unsigned 8-bit integer from buffer.

### `readUint16() : number` ###
Reads a unsigned 16-bit integer from buffer.

### `readUint32() : number` ###
Reads a unsigned 32-bit integer from buffer.

### `readVarInt() : number` ###

### `readFloat32() : number` ###
Reads a signed 32-bit float number from buffer.

### `readFloat64() : number` ###
Reads a signed 64-bit float number from buffer.

### `readASCII(length:number) : string` ###
Reads a string of `length` consisting of only ASCII characters from buffer.

### `readString() : string` ###
Reads a string from buffer.

### `readUint8At(offset:number) : number` ###
Similar to `readUint8()` except it reads data from the specified offset.  Unlike other read methods, this will not increment the value of `offset`.

## `MuBuffer` ##
A handy wrapper that provides `DataView` and `Uint8Array` views to the internal buffer.

### `buffer:ArrayBuffer` ###
The internal binary buffer.

### `dataView:DataView` ###
The `DataView` view of `this.buffer`.

### `uint8:Uint8Array` ###
The `Uint8Array` view of `this.buffer`.

# usage tips #

- normally you should not use `MuBuffer` directly
- remember to destroy the stream after using it
- try to minimize the uses of `grow()`

# TODO #

- bulk access to the internal buffer

# credits
Development supported by Shenzhen DianMao Digital Technology Co., Ltd.

<img src="https://raw.githubusercontent.com/mikolalysenko/mudb/master/img/logo.png" />

Written in Shenzhen, China.

(c) 2017 Mikola Lysenko, Shenzhen DianMao Digital Technology Co., Ltd.
