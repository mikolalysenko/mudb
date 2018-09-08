# muschema
An extensible system for defining [schemas](https://en.wikipedia.org/wiki/Database_schema), which describe structures of the data.

Schemas allow run-time type reflection, object pooling, and more importantly, [binary serialization](https://docs.microsoft.com/en-us/dotnet/standard/serialization/binary-serialization).  And in `mudb`, all message interfaces are specified by schemas.

Compared to protobuf, `muschema` is better in that it supports [delta encoding](https://en.wikipedia.org/wiki/Delta_encoding) and is easier to customize (and worse in the sense that it only works in JavaScript).

TypeScript and Node.js friendly!

## example
Here is a contrived example showing how all of the methods of the schemas work.

```javascript
const {
    MuFloat64,
    MuInt32,
    MuString,
    MuDictionary
    MuStruct,
} = require('muschema')
const {
    MuWriteStream,
    MuReadStream,
} = require('mustreams')

// define an entity schema
const EntitySchema = new MuStruct({
    x: new MuFloat64(),
    y: new MuFloat64(),
    dx: new MuFloat64(),
    dy: new MuFloat64(),
    hp: new MuInt32(10),
    name: new MuString('entity')
})

// define an entity set schema
const EntitySetSchema = new MuDictionary(EntitySchema)

// create a new entity set object using the schema
const entities = EntitySetSchema.alloc()

// create a new entity and add it to the schema
const player = EntitySchema.alloc()

player.x = 10
player.y = 10
player.dx = -10
player.dy = -20
player.name = 'winnie'

entities['pooh'] = player

// make a copy of all entities
const otherEntities = EntitySetSchema.clone(entities)

// modify player entity
otherEntities.foo.hp = 1

// compute a patch and write it to stream
const out = new MuWriteStream(32)
const hasPatch = EntitySetSchema.diff(entities, otherEntities, out)

let otherEntitiesCopy = EntitySetSchema.clone(entities)
if (hasPatch) {
    // read the patch from stream and apply it to
    // a copy of entities
    const inp = new MuReadStream(out.bytes())
    otherEntitiesCopy = EntitySetSchema.patch(otherEntitiesCopy, inp)
}

// pool objects
EntitySetSchema.free(otherEntities)
```

# table of contents

   * [1 install](#section_1)
   * [2 api](#section_2)
      * [2.1 interface](#section_2.1)
      * [2.2 primitives](#section_2.2)
         * [2.2.1 void](#section_2.2.1)
         * [2.2.2 boolean](#section_2.2.2)
         * [2.2.3 number](#section_2.2.3)
         * [2.2.4 string](#section_2.2.4)
      * [2.3 functors](#section_2.3)
         * [2.3.1 struct](#section_2.3.1)
         * [2.3.2 array](#section_2.3.2)
         * [2.3.3 sorted array](#section_2.3.3)
         * [2.3.4 union](#section_2.3.4)
      * [2.4 data structures](#section_2.4)
         * [2.4.1 dictionary](#section_2.4.1)
         * [2.4.2 vector](#section_2.4.2)
   * [3 more examples](#section_3)
      * [3.1 features](#section_3.1)
      * [3.2 schema types](#section_3.2)
      * [3.3 TBD](#section_3.3)

# <a name="section_1"></a> 1 install

```
npm i muschema
```

# <a name="section_2"></a> 2 api

## <a name="section_2.1"></a> 2.1 interface
Each schema should implement the `MuSchema` interface:
* `identity` the default value of the schema
* `muType` a string of type name for run-time reflection
* `muData` (optional) additional run-time information, usually the schema of members
* `alloc()` creates a new value from scratch, or fetches a value from the object pool
* `free(value)` recycles the value to the object pool
* `equal(a, b)` determines whether two values are equal
* `clone(value)` duplicates the value
* `copy(source, target)` copies the content of `source` to `target`
* `diff(base, target, outStream)` computes a patch from `base` to `target`
* `patch(base, inpStream)` applies a patch to `base` to create a new value

Methods should obey the following semantics.
```js
equal(a, b) === !diff(a, b, out)
```
```js
copy(source, target)
equal(target, clone(source)) === true
```
```js
diff(base, target, out)
equal(patch(base, inp), target) === true
```

For situations where you don't have a base,
```javascript
schema.diff(schema.identity, value, out)
schema.patch(schema.identity, inp)
```

Schemas can be composed recursively by calling submethods.  `muschema` provides several common schemas for primitive types and some functions for combining them together into structs, tuples and other common data structures.  If necessary user-defined applications can specify custom serialization and diff/patch methods for various common types.

### for TypeScript ##
For TypeScript, the generic interface described above can be found in `muschema/schema`.  The module exports the interface as `MuSchema<ValueType>`, which any schema types should implement.

## <a name="section_2.2"></a> 2.2 primitives
`muschema` comes with schema types for all primitive types in JavaScript out of the box.

### <a name="section_2.2.1"></a> 2.2.1 void
An empty value type.  Useful for specifying arguments to messages which do not need to be serialized.

```javascript
const { MuVoid } = require('muschema/void')

const EmptySchema = new MuVoid()

EmptySchema.identity    // always undefined
EmptySchema.muType      // 'void'

const nothingness = EmptySchema.alloc() // undefined
EmptySchema.free(nothingness)           // noop
EmptySchema.clone(nothingness)          // always returns undefined
```

### <a name="section_2.2.2"></a> 2.2.2 boolean
`true` or `false`

```javascript
const { MuBoolean } = require('muschema/boolean')

const SwitchSchema = new MuBoolean(identity)

SwitchSchema.identity   // defaults to false if not specified
SwitchSchema.muType     // 'boolean'

const switch = SwitchSchema.alloc() // equals identity
SwitchSchema.free(switch)           // noop
SwitchSchema.clone(switch)          // returns the value of `switch`
```

### <a name="section_2.2.3"></a> 2.2.3 number

```javascript
// for signed integers of 8/16/32-bit
const { MuInt8 } = require('muschema/int8')
const { MuInt16 } = require('muschema/int16')
const { MuInt32 } = require('muschema/int32')

// for unsigned integers of 8/16/32-bit
const { MuUint8 } = require('muschema/uint8')
const { MuUint16 } = require('muschema/uint16')
const { MuUint32 } = require('muschema/uint32')

// for floating point of 32/64-bit
const { MuFloat32 } = require('muschema/float32')
const { MuFloat64 } = require('muschema/float64')

// here MuNumber stands for any of the number schema types
const AnyNumberSchema = new MuNumber(identity)

AnyNumberSchema.identity    // defaults to 0 if not specified
AnyNumberSchema.muType      // string of one of int8/int16/int32/uint8/uint16/uint32/float32/float64
                            // depending on the schema type

const num = AnyNumberSchema.alloc() // equals identity
AnyNumberSchema.free(num)           // noop
AnyNumberSchema.clone(num)          // returns the value of `num`
```

* for numbers in general, use `MuFloat64`
* but if you know the range of the numbers in advance, use a more specific data type instead

### <a name="section_2.2.4"></a> 2.2.4 string

```javascript
const { MuString } = require('muschema/string')
const { MuASCII } = require('muschema/ascii')
const { MuFixedASCII } = require('muschema/fixed-ascii')

const MessageSchema = new MuString(identity)
MessageSchema.identity              // defaults to '' if not specified
MessageSchema.muType                // 'string'

const msg = MessageSchema.alloc()   // equals identity
MessageSchema.free(msg)             // noop
MessageSchema.clone(msg)            // returns the value of `msg`

const UsernameSchema = new MuASCII(identity)
UsernameSchema.identity                 // defaults to '' if not specified
UsernameSchema.muType                   // 'ascii'

const username = UsernameSchema.alloc() // equals identity
UsernameSchema.free(username)           // noop
UsernameSchema.clone(username)          // returns the value of `username`

// for this schema type, you must either specify the identity
const phoneNumberSchema = new MuFixedASCII('1234567890')
phoneNumberSchema.identity              // '1234567890'
phoneNumberSchema.muType                // 'fixed-ascii'
phoneNumberSchema.length                // 10, the length of all strings in this schema
const phone = phoneNumberSchema.alloc() // '1234567890'

// or the fixed length
const IDSchema = new MuFixedASCII(8)
IDSchema.identity           // a string of 8 spaces
IDSchema.length             // 8

const id = IDSchema.alloc() // a string of 8 spaces
IDSchema.free(id)           // noop
IDSchema.clone(id)          // returns the value of `id`
```

* for strings in general, use `MuString`
* if the strings consist of only ASCII characters, use `MuASCII`
* if the strings consist of only ASCII characters and are of the same length, use `MuFixedASCII` instead

## <a name="section_2.3"></a> 2.3 functors
Primitive data types in `muschema` can be composed using functors.  These take in multiple sub-schemas and construct new schemas.

### <a name="section_2.3.1"></a> 2.3.1 struct
A struct is a collection of subtypes.  Structs are constructed by passing in a dictionary of schemas.  Struct schemas may be nested as follows:

```javascript
const { MuFloat64 } = require('muschema/float64')
const { MuStruct } = require('muschema/struct')

const Vec2 = new MuStruct({
    x: new MuFloat64(0),
    y: new MuFloat64(0),
})
const Particle = new MuStruct({
    position: Vec2,
    velocity: Vec2
})

const p = Particle.alloc()
p.position.x = 10
p.position.y = 10

// Particle.free recursively calls Vec2.free
Particle.free(p)
```

### <a name="section_2.3.2"></a> 2.3.2 array

```javascript
const { MuStruct } = require('muschema/struct')
const { MuArray } = require('muschema/array')
const { MuUint32 } = require('muschema/uint32')

const SlotSchema = new MuStruct({
    item_id: new MuUint32()
    amount: new MuUint32()
})
const InventorySchema = new MuArray(SlotSchema, identity)

InventorySchema.identity    // defaults to [] if not specified
InventorySchema.muType      // 'array'
InventorySchema.muData      // SlotSchema

const backpack = InventorySchema.alloc()    // always []
InventorySchema.free(backpack)              // pools `backpack` and all its members
InventorySchema.clone(backpack)             // returns a deep copy of `backpack`
```

### <a name="section_2.3.3"></a> 2.3.3 sorted array

```javascript
const { MuStruct } = require('muschema/struct')
const { MuSortedArray } = require('muschema/sorted')
const { MuUint8 } = require('muschema/uint8')

function compare (a, b) {
    if (a.rank < b.rank) {
        return -1
    } else if (a.rank > b.rank) {
        return 1
    }

    if (a.suit < b.suit) {
        return -1
    } else if (a.suit > b.suit) {
        return 1
    } else {
        return 0
    }
}

const CardSchema = new MuStruct({
    suit: new MuUint8(),
    rank: new MuUint8(),
})
const DeckSchema = new MuSortedArray(CardSchema, compare, identity)

DeckSchema.identity     // defaults to []
                        // if identity specified, will be a sorted copy of it
DeckSchema.muType       // 'sorted-set'
DeckSchema.muData       // CardSchema
DeckSchema.compare      // reference to the compare function

const deck = DeckSchema.alloc() // always []
DeckSchema.free(deck)           // pools `deck` and all its members
DeckSchema.clone(deck)          // returns a deep copy of `deck`
```

### <a name="section_2.3.4"></a> 2.3.4 union
A discriminated union of several subtypes.  Each subtype must be given a label.

```javascript
const { MuFloat64 } = require('muschema/float64')
const { MuString } = require('muschema/string')
const { MuUnion } = require('muschema/union')
const { MuWriteStream, MuReadStream } = require('mustreams')

const FloatOrString = new MuUnion({
    float: new MuFloat64('foo'),
    string: new MuString('bar'),
})

// create a new value
const x = FloatOrString.alloc()
x.type = 'float'
x.data = 1

// compute a delta and write it to stream
const out = new MuWriteStream(32)
FloatOrString.diff(FloatOrString.identity, x, out)

// apply a patch
const inp = new MuReadStream(out.buffer.uint32)
const y = FloatOrString.patch(FloatOrString.identity, inp)
```

## <a name="section_2.4"></a> 2.4 data structures

### <a name="section_2.4.1"></a> 2.4.1 dictionary
A dictionary is a labelled collection of values.

```javascript
const { MuUint32 } = require('muschema/uint32')
const { MuDictionary } = require('muschema/dictionary')

const NumberDictionary = new MuDictionary(new MuUint32(), identity)
NumberDictionary.identity   // defaults to {} if not specified
NumberDictionary.muType     // 'dictionary'
NumberDictionary.muData     // a MuUint32 schema

const dict = NumberDictionary.alloc()
dict['foo'] = 3

NumberDictionary.free(dict)     // pools `dict` and all its members
NumberDictionary.clone(dict)    // returns a deep copy of `dict`
```

### <a name="section_2.4.2"></a> 2.4.2 vector

```javascript
const { MuVector } = require('muschema/vector')
const { MuFloat32 } = require('muschema/float64')

const ColorSchema = new MuVector(new MuFloat32(), 4)
ColorSchema.identity    // Float32Array [0, 0, 0, 0]
ColorSchema.muType      // 'vector'
ColorSchema.muData      // reference to the specified MuFloat32 schema
ColorSchema.dimension   // 4

const rgba = ColorSchema.alloc()    // Float32Array [0, 0, 0, 0]
ColorSchema.free(rgba)              // pools `rgba`
ColorSchema.clone(rgba)             // returns a copy of `rgba`
```

# <a name="section_3"></a> 3 more examples

Check out `mudb` for some examples of using `muschema`.

# TODO

## <a name="section_3.1"></a> 3.1 features

* smarter delta encoding
* memory pool stats

## <a name="section_3.2"></a> 3.2 schema types

* fixed point numbers
* enums
* tuples
* multidimensional arrays

## <a name="section_3.3"></a> 3.3 TBD

* should models define constructors?
* should pool allocation be optional?
    + some types don't need a pool
    + pooled allocation can be cumbersome
* do we need JSON and RPC serialization for debugging?

# credits
Development supported by Shenzhen DianMao Digital Technology Co., Ltd.

<img src="https://raw.githubusercontent.com/mikolalysenko/mudb/master/img/logo.png" />

Written in Shenzhen, China.

(c) 2017 Mikola Lysenko, Shenzhen DianMao Digital Technology Co., Ltd.


