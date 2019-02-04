# mustream
Binary stream API for mudb.  It is different from the Stream API of Node.js in that

- all streams of this API operate on typed arrays
- it provides built-in buffer pooling to help you minimize garbage collection

**WIP**

## example

Here is a highly contrived example of using `mustreams`.

```javascript
// on client side

var MuWriteStream = require('mustreams').MuWriteStream

var initialBufferSize = 2
var stream = new MuWriteStream(initialBufferSize)

var socket = new WebSocket(/* server url */)
// make sure data will be received in ArrayBuffer form
socket.binaryType = 'arraybuffer'

// increase the buffer size by 62 bytes
stream.grow(62)

stream.writeString('ピカチュウ')
stream.writeUint8(2)    // length of 'hp'
stream.writeASCII('hp')
stream.writeUint8(100)

// send buffered data
socket.send(stream.bytes())

// pool the buffer
stream.destroy()
```

```javascript
// on server side

var createServer = require('http').createServer
var Server = require('uws').Server
var MuReadStream = require('mustreams').MuReadStream

var socketServer = new Server({ server: createServer() })
socketServer.on('connection', function (socket) {
    socket.onmessage = function (ev) {
        if (ev.data instanceof ArrayBuffer) {
            var stream = new MuReadStream(new Uint8Array(ev.data))

            stream.readString()                     // 'ピカチュウ'
            stream.readASCII(stream.readUint8())    // 'hp'
            stream.readUint8()                      // 100

            // pool the buffer
            stream.destroy()
        }
    }
})
```

# table of contents

   * [2 api](#section_2)
      * [2.1 `MuWriteStream(bufferCapacity:number)`](#section_2.1)
         * [2.1.1 `buffer:MuBuffer`](#section_2.1.1)
         * [2.1.2 `offset:number`](#section_2.1.2)
         * [2.1.3 `bytes() : Uint8Array`](#section_2.1.3)
         * [2.1.4 `grow(numBytes:number)`](#section_2.1.4)
         * [2.1.5 `destroy()`](#section_2.1.5)
         * [2.1.6 `writeInt8(i:number)`](#section_2.1.6)
         * [2.1.7 `writeInt16(i:number)`](#section_2.1.7)
         * [2.1.8 `writeInt32(i:number)`](#section_2.1.8)
         * [2.1.9 `writeUint8(i:number)`](#section_2.1.9)
         * [2.1.10 `writeUint16(i:number)`](#section_2.1.10)
         * [2.1.11 `writeUint32(i:number)`](#section_2.1.11)
         * [2.1.12 `writeVarInt(i:number)`](#section_2.1.12)
         * [2.1.13 `writeFloat32(f:number)`](#section_2.1.13)
         * [2.1.14 `writeFloat64(f:number)`](#section_2.1.14)
         * [2.1.15 `writeASCII(s:string)`](#section_2.1.15)
         * [2.1.16 `writeString(s:string)`](#section_2.1.16)
         * [2.1.17 `writeUint8At(offset:number, i:number)`](#section_2.1.17)
      * [2.2 `MuReadStream(data:Uint8Array)`](#section_2.2)
         * [2.2.1 `buffer:MuBuffer`](#section_2.2.1)
         * [2.2.2 `offset:number`](#section_2.2.2)
         * [2.2.3 `length:number`](#section_2.2.3)
         * [2.2.4 `readInt8() : number`](#section_2.2.4)
         * [2.2.5 `readInt16() : number`](#section_2.2.5)
         * [2.2.6 `readInt32() : number`](#section_2.2.6)
         * [2.2.7 `readUint8() : number`](#section_2.2.7)
         * [2.2.8 `readUint16() : number`](#section_2.2.8)
         * [2.2.9 `readUint32() : number`](#section_2.2.9)
         * [2.2.10 `readVarInt() : number`](#section_2.2.10)
         * [2.2.11 `readFloat32() : number`](#section_2.2.11)
         * [2.2.12 `readFloat64() : number`](#section_2.2.12)
         * [2.2.13 `readASCII(length:number) : string`](#section_2.2.13)
         * [2.2.14 `readString() : string`](#section_2.2.14)
         * [2.2.15 `readUint8At(offset:number) : number`](#section_2.2.15)
      * [2.3 `MuBuffer`](#section_2.3)
         * [2.3.1 `buffer:ArrayBuffer`](#section_2.3.1)
         * [2.3.2 `dataView:DataView`](#section_2.3.2)
         * [2.3.3 `uint8:Uint8Array`](#section_2.3.3)
   * [3 usage tips](#section_3)
   * [4 TODO](#section_4)

# <a name="section_2"></a> 2 api

The methods of `MuWriteStream` and `MuReadStream` are closely related so they are meant to be used together.

## <a name="section_2.1"></a> 2.1 `MuWriteStream(bufferCapacity:number)`
An interface through which you can buffer different types of data.

### <a name="section_2.1.1"></a> 2.1.1 `buffer:MuBuffer`
A wrapper object providing access to the internal buffer.

### <a name="section_2.1.2"></a> 2.1.2 `offset:number`
The offset in bytes from the start of the internal buffer which marks the position where the data will be written.  The value of `offset` is automatically incremented whenever you write to the stream.

### <a name="section_2.1.3"></a> 2.1.3 `bytes() : Uint8Array`
Creates a copy of a portion of the internal buffer, from the start to the position marked by `offset`.

### <a name="section_2.1.4"></a> 2.1.4 `grow(numBytes:number)`
Increases the size of the internal buffer by a number of bytes.  The resulted buffer size will always be a power of 2.

### <a name="section_2.1.5"></a> 2.1.5 `destroy()`
Pools `this.buffer`.

### <a name="section_2.1.6"></a> 2.1.6 `writeInt8(i:number)`
Buffers a signed 8-bit integer ranging from -128 to 127.

### <a name="section_2.1.7"></a> 2.1.7 `writeInt16(i:number)`
Buffers a signed 16-bit integer ranging from -32768 to 32767.

### <a name="section_2.1.8"></a> 2.1.8 `writeInt32(i:number)`
Buffers a signed 32-bit integer ranging from -2147483648 to 2147483647.

### <a name="section_2.1.9"></a> 2.1.9 `writeUint8(i:number)`
Buffers an unsigned 8-bit integer ranging from 0 to 255.

### <a name="section_2.1.10"></a> 2.1.10 `writeUint16(i:number)`
Buffers an unsigned 16-bit integer ranging from 0 to 65535.

### <a name="section_2.1.11"></a> 2.1.11 `writeUint32(i:number)`
Buffers an unsigned 32-bit integer ranging from 0 to 4294967295.

### <a name="section_2.1.12"></a> 2.1.12 `writeVarInt(i:number)`
Buffers an unsigned integer ranging from 0 to 4294967295.  The number of bytes used to store `i` varies by the value.  So unlike other write methods, `writeVarInt()` uses no more space than it is required to store `i`.

### <a name="section_2.1.13"></a> 2.1.13 `writeFloat32(f:number)`
Buffers a signed 32-bit float number whose absolute value ranging from 1.2e-38 to 3.4e38, with 7 significant digits.

### <a name="section_2.1.14"></a> 2.1.14 `writeFloat64(f:number)`
Buffers a signed 64-bit float number whose absolute value ranging from 5.0e-324 to 1.8e308, with 15 significant digits.

### <a name="section_2.1.15"></a> 2.1.15 `writeASCII(s:string)`
Buffers a string composed of only ASCII characters.

### <a name="section_2.1.16"></a> 2.1.16 `writeString(s:string)`
Buffers a string which may contain non-ASCII characters.

### <a name="section_2.1.17"></a> 2.1.17 `writeUint8At(offset:number, i:number)`
Similar to `writeUint8()` except it writes the integer at the position marked by the specified offset.  Note that unlike other write methods, this method will not increment the value of `offset`.

## <a name="section_2.2"></a> 2.2 `MuReadStream(data:Uint8Array)`
An interface through which you can retrieve different types of data from the buffer.

### <a name="section_2.2.1"></a> 2.2.1 `buffer:MuBuffer`
A wrapper object providing access to the internal buffer.

### <a name="section_2.2.2"></a> 2.2.2 `offset:number`
The offset in bytes from the start of the internal buffer which marks the position the data will be read from.  The value of `offset` is automatically incremented whenever you read from the stream.

### <a name="section_2.2.3"></a> 2.2.3 `length:number`

### <a name="section_2.2.4"></a> 2.2.4 `readInt8() : number`
Reads a signed 8-bit integer from buffer.

### <a name="section_2.2.5"></a> 2.2.5 `readInt16() : number`
Reads a signed 16-bit integer from buffer.

### <a name="section_2.2.6"></a> 2.2.6 `readInt32() : number`
Reads a signed 32-bit integer from buffer.

### <a name="section_2.2.7"></a> 2.2.7 `readUint8() : number`
Reads a unsigned 8-bit integer from buffer.

### <a name="section_2.2.8"></a> 2.2.8 `readUint16() : number`
Reads a unsigned 16-bit integer from buffer.

### <a name="section_2.2.9"></a> 2.2.9 `readUint32() : number`
Reads a unsigned 32-bit integer from buffer.

### <a name="section_2.2.10"></a> 2.2.10 `readVarInt() : number`

### <a name="section_2.2.11"></a> 2.2.11 `readFloat32() : number`
Reads a signed 32-bit float number from buffer.

### <a name="section_2.2.12"></a> 2.2.12 `readFloat64() : number`
Reads a signed 64-bit float number from buffer.

### <a name="section_2.2.13"></a> 2.2.13 `readASCII(length:number) : string`
Reads a string of `length` consisting of only ASCII characters from buffer.

### <a name="section_2.2.14"></a> 2.2.14 `readString() : string`
Reads a string from buffer.

### <a name="section_2.2.15"></a> 2.2.15 `readUint8At(offset:number) : number`
Similar to `readUint8()` except it reads data from the specified offset.  Unlike other read methods, this will not increment the value of `offset`.

## <a name="section_2.3"></a> 2.3 `MuBuffer`
A handy wrapper that provides `DataView` and `Uint8Array` views to the internal buffer.

### <a name="section_2.3.1"></a> 2.3.1 `buffer:ArrayBuffer`
The internal binary buffer.

### <a name="section_2.3.2"></a> 2.3.2 `dataView:DataView`
The `DataView` view of `this.buffer`.

### <a name="section_2.3.3"></a> 2.3.3 `uint8:Uint8Array`
The `Uint8Array` view of `this.buffer`.

# <a name="section_3"></a> 3 usage tips

- normally you should not use `MuBuffer` directly
- remember to destroy the stream after using it
- try to minimize the uses of `grow()`

# <a name="section_4"></a> 4 TODO

- bulk access to the internal buffer

# credits
Copyright (c) 2017 Mikola Lysenko, Shenzhen Dianmao Technology Company Limited


