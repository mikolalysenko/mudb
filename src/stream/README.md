# stream
growable binary streams built on top of `ArrayBuffer`, with internal buffer pooling

## example
```javascript
const { MuWriteStream, MuReadStream } = require('mudb/stream')

// create a write-only stream with buffer of 4 bytes
const inp = new MuWriteStream(4)

// write stuff to it
const prop = 'hp'
inp.writeVarint(prop.length)
inp.writeASCII(prop)
inp.writeUint8(100)

// if you're not sure whether the buffer has enough space for the data coming in,
// you should grow the stream before you write to it.  it's ok to over grow a bit
inp.grow(60)
inp.writeString('半分しか食べてないままで捨てちゃダメ')

// get the data written to the buffer, which can then be transferred over the Internet
const data = inp.bytes()

// remember to destroy the stream
inp.destroy()

// create a read-only stream with the received data
const out = new MuReadStream(data)

// read data in the order as they were written
const propLeng = out.readVarint()
out.readASCII(propLeng) // 'hp'
out.readUint8()         // 100
out.readString()        // '半分しか食べてないままで捨てちゃダメ'
```

## API
* [MuWriteStream](#muwritestream)
* [MuReadStream](#mureadstream)
* [MuBuffer](#mubuffer)

### usage tips
* data written by `writeX()` is meant to be read by the corresponding `readX()`
* remember to destroy the stream after using it, doing so can help reduce GC, which in turn leads to better performance
* try to reduce the calls to `grow()` when possible
* prefer the use of `writeVarint()` over "larger" variants like `writeUint32()` when the values can be large and small, it may save you some bytes

---

### `MuWriteStream`
Provides a set of methods to write different types of data to the buffer.

```ts
new MuWriteStream(capacity:number)
```
* `capacity` initial buffer byte size

#### props
```ts
buffer:MuBuffer
```
A handy wrapper of the buffer.

```ts
offset:number
```
The pointer that marks where data will be written next, by a write method.

#### methods
```ts
grow(size:number) : void
```
Grows the buffer when necessary, to guarantee at least `size` bytes can be written to the buffer.

```ts
bytes() : Uint8Array
```
Returns a slice holding the buffered data.

```ts
destroy() : void
```
Pools the buffer, SHOULD be called after using the stream.  DO NOT write to a destroyed stream.

```ts
writeUint8(n:number) : void
```
Writes `n` as uint8 to the buffer.  `n` should be in the range [0, 255] in order to get the correct result.  As other write methods, it increments the pointer.

```ts
writeUint16(n:number) : void
```
`n` should be in the range [0, 65535].

```ts
writeUint32(n:number) : void
```
`n` should be in the range [0, 4294967295].

```ts
writeVarint(n:number) : void
```
`n` should be in the range [0, 4294967295].  `n` is encoded as a [variable-length integer](https://en.wikipedia.org/wiki/Variable-length_quantity#General_structure), hence the name.  Compared to other write methods like `writeUint32()`, rather than a fixed number of bytes, `writeVarint()` only consumes space required to encode the number.

```ts
writeInt8(n:number) : void
```
`n` should be in the range [-128, 127].

```ts
writeInt16(n:number) : void
```
`n` should be in the range [-32768, 32767].

```ts
writeInt32(n:number) : void
```
`n` should be in the range [-2147483648, 2147483647].

```ts
writeFloat32(n:number) : void
```
Absolute value of `n` should be in the range [1.2e-38, 3.4e38], with 7 significant digits.

```ts
writeFloat64(n:number) : void
```
Absolute value of `n` should be in the range [5.0e-324, 1.8e308], with 15 significant digits.

```ts
writeASCII(s:string) : void
```
`s` should be a string composed of only ASCII characters.  You MUST keep track of the string length yourself, like writing the length to the buffer along with the string, as the example shows.

```ts
writeString(s:string) : void
```
`s` can be a string composed of any Unicode characters.  Unlike `writeASCII()`, `writeString()` keeps track of the string length.

```ts
writeUint8At(offset:number, n:number) : void
```

```ts
writeUint32At(offset:number, n:number) : void
```
Unlike their variants, these methods write to the buffer at the specified `offset` and doesn't increment the pointer.

---

### `MuReadStream`
Provides a set of read methods to read different types of data from the buffer.

```ts
new MuReadStream(bytes:Uint8Array)
```
* `bytes` usually comes from `writeStream.bytes()`

#### props
```ts
buffer:MuBuffer
```
A handy wrapper of the buffer.

```ts
length:number
```
Byte length of the buffer.

```ts
offset:number
```
The pointer that marks where data will be read from next, by a read method.

#### methods
```ts
bytes() : Uint8Array
```
Returns a slice of the buffer holding the unread data.

```ts
readUint8() : number
```
Reads a number as uint8 from the buffer and increments the pointer.  Other read methods below share similar behavior.

```ts
readUint16() : number
```

```ts
readUint32() : number
```

```ts
readVarint() : number
```

```ts
readInt8() : number
```

```ts
readInt16() : number
```

```ts
readInt32() : number
```

```ts
readFloat32() : number
```

```ts
readFloat64() : number
```

```ts
readASCII(length:number) : string
```
* `length` length of the string written to the buffer

```ts
readString() : string
```
Unlike `readASCII()`, you don't need to worry about the length of the string.

```ts
readUint8At(offset:number) : number
```
Unlike its variant, `readUint8At()` reads from the specified `offset` and doesn't increment the pointer.

---

### `MuBuffer`
A handy wrapper cumulating different views over the underlying `ArrayBuffer`.

```ts
new MuBuffer(buffer:ArrayBuffer)
```

#### props
```ts
buffer:ArrayBuffer
```
Reference to the buffer.

```ts
dataView:DataView
```
**DataView** view over the buffer.

```ts
uint8:Uint8Array
```
**Uint8Array** view over the buffer.

## ideas
* bulk access to the internal buffer
