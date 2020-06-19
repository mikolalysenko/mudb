# schema
a collection of composable data types for defining message structures, with an emphasis on bandwidth efficiency and performance by leveraging [delta encoding](https://en.wikipedia.org/wiki/Delta_encoding) and [object pooling](https://en.wikipedia.org/wiki/Object_pool_pattern)

Like [protocol buffers](https://developers.google.com/protocol-buffers/), `schema` does binary serialization and makes extensive use of code generation, but it departs from protocol buffers in 3 ways:

* **Javascript only** Unlike protocol buffers, `schema` has no aspirations of ever being cross-language.  However, it does make it much easier to extend `mudb` to support direct serialization of custom application specific data structures.  For example, you could store all of your objects in an octree and apply a custom schema to directly diff this octree into your own data type.
* **0-copy delta encoding** `schema` performs all serialization as a relative `diff` operation.  This means that messages and state changes can be encoded as changes relative to some observed reference.  Using relative state changes greatly reduces the amount of bandwidth required to replicate a given change set.
* **Memory pools** JavaScript is a garbage collected language, and creating patched versions of different messages can generate many temporary objects.  In order to avoid needless and wasteful GC thrashing, `schema` provides a pooling interface and custom memory allocator.

## example

```ts
import { MuStruct, MuVarint, MuASCII, MuUint8, MuArray } from 'mudb/schema'
import { MuWriteStream, MuReadStream } from 'mudb/stream'

// data structure of an entity
const EntitySchema = new MuStruct({
    id: new MuVarint(),
    name: new MuASCII('entity'),
    coordinates: new MuStruct({
        x: new MuUint8(0),
        y: new MuUint8(0),
    }),
})
// data structure of a set of entities
const EntitySetSchema = new MuArray(EntitySchema, 100)

// allocate an entity
const dinosaur = EntitySchema.alloc()
dinosaur.id = 1
dinosaur.name = 'dinosaur'
dinosaur.coordinates.x = 10
dinosaur.coordinates.y = 10

// allocate a set
const set = EntitySetSchema.alloc()
set.push(dinosaur)

// make a deep clone
const setCopy = EntitySetSchema.clone(set)

// assign data to an existing set
const anotherSet = EntitySetSchema.alloc()
EntitySetSchema.assign(anotherSet, set)

// modify setCopy
setCopy[0].coordinates.x = 15
setCopy[0].coordinates.y = 25

// make an approximation of how many bytes you'll need for serialization
// it's ok if your guess is off
const out = new MuWriteStream(32)

// compute the diff and write to `out` if any
// different is a boolean indicating whether there is a diff
const different = EntitySetSchema.diff(set, setCopy, out)
if (different) {
    // it uses 6 bytes to serialize the copy
    // Uint8Array(6) [ 1, 1, 2, 3, 15, 25 ]
    // 1    new array length
    // 1    should patch the 1st element
    // 2    index of prop to be patched, which is `coordinates`
    // 3    0b0011, indicating both `x` and `y` changed
    // 15   new value of `x`
    // 25   new value of `y`
    const bytes = out.bytes()

    console.log(EntitySetSchema.patch(set, new MuReadStream(bytes)))
}

// yes, you should
EntitySetSchema.free(set)
EntitySetSchema.free(setCopy)
EntitySetSchema.free(anotherSet)
```

## API

* [`MuSchema`](#muschema)
* non-functor
    * primitive
        * [boolean](#boolean)
        * [number](#number)
        * [string](#string)
        * [void](#void)
    * collection
        * [vector](#vector)
    * special
        * [date](#date)
        * [json](#json)
* functor
    * [array](#array)
    * [sorted array](#sortedarray)
    * [dictionary](#dictionary)
    * [struct](#struct)
    * [union](#union)

*Functor* refers a generic type that takes one or more subtypes as parameters.  Some can be used to create deeply nested structures.

*Primitives* basically align with the primitive types in JavaScript.

---

### `MuSchema`
```ts
interface MuSchema<V extends any>
```
All `schema` classes implement the `MuSchema` interface.

`mudb` also works well with user-defined schema types that faithfully implement `MuSchema`.  But before you try to do that, check out the schema types the `schema` module provides, or consider opening an issue to tell us about the type you want.

#### props
```ts
readonly identity:V
```
default value of the schema

```ts
readonly json:object
```
JSON description of the schema used for schema comparison

```ts
readonly muType:string
```
type info for runtime inspection

```ts
readonly muData?:any
```
optional extra type info, often refers to schema of the subtype

#### methods
```ts
alloc() : V
```
allocates a value of the type, should return a value from the pool if applicable

```ts
free(x:V) : void
```
pools the value when applicable

```ts
assign(dst:V, src:V) : V
```
assigns `dst` the value of `src`, should return `dst`

```ts
clone(x:V) : V
```
creates a deep clone of `x`

```ts
cloneIdentity() : V
```
creates a deep clone of `identity`

```ts
diff(base:V, target:V, out:MuWriteStream) : boolean
```
computes the diff from `base` to `target` (think `target` - `base`), and writes it to `out` if any, the return should indicate whether there is a diff

```ts
patch(base:V, inp:MuReadStream) : V

// use `identity` as the base if you don't have an observed base value
schema.diff(schema.identity, value, out)
schema.patch(schema.identity, inp)
```
reads the diff from `inp` and patches `base` with the diff to create a new value

```ts
toJSON(x:V) : any
```
converts `x` to a JSON value so that it can be correctly stringified

```ts
fromJSON(json:any) : V
```
converts the JSON value back to its original format

#### contract
The methods should be implemented so that comparisons below hold true.
```ts
// ONLY applicable to primitive types
schema.alloc() === schema.identity
```

```ts
c = schema.assign(a, b)
deepEqual(c, b) === true

// ONLY applicable to reference types
c === a
```

```ts
y = schema.clone(x)
deepEqual(y, x) === true
```

```ts
x = schema.cloneIdentity()
deepEqual(x, schema.identity)
```

```ts
schema.equal(a, b) === deepEqual(a, b)
```

```ts
// when the values are deep equal, `diff()` should return false
// otherwise, `diff()` should return true
schema.diff(a, b, out) === !deepEqual(a, b)
```

```ts
// when `diff()` returns true, at lease one byte should be written to `out`
// when `diff()` returns false, nothing should be written
origin = out.offset
if (schema.diff(a, b, out)) {
    out.offset > origin
}
if (!schema.diff(a, b, out)) {
    out.offset === origin
}
```

```ts
// the value you get by patching `a` with the diff from `a` to `b`
// should be deep equal to `b`
schema.diff(a, b, out)
inp = new MuReadStream(out.bytes())
deepEqual(schema.patch(a, inp), b) === true
```

```ts
deepEqual(schema.fromJSON(schema.toJSON(x)), x) === true
```

---

### boolean
```ts
import { MuBoolean } from 'mudb/schema/boolean'
new MuBoolean(identity?:boolean)
```

---

### number
```ts
import { MuUint8 } from 'mudb/schema/uint8'
import { MuUint16 } from 'mudb/schema/uint16'
import { MuUint32 } from 'mudb/schema/uint32'
import { MuInt8 } from 'mudb/schema/int8'
import { MuInt16 } from 'mudb/schema/int16'
import { MuInt32 } from 'mudb/schema/int32'
import { MuFloat32 } from 'mudb/schema/float32'
import { MuFloat64 } from 'mudb/schema/float64'
import { MuVarint } from 'mudb/schema/varint'
import { MuRelativeVarint } from 'mudb/schema/rvarint'

// fixed-length encoding
new MuUint8(identity?:number)
new MuUint16(identity?:number)
new MuUint32(identity?:number)
new MuInt8(identity?:number)
new MuInt16(identity?:number)
new MuInt32(identity?:number)
new MuFloat32(identity?:number)
new MuFloat64(identity?:number)

// variable-length encoding
new MuVarint(identity?:number)
new MuRelativeVarint(identity?:number)
```

---

### string
```ts
import { MuASCII } from 'mudb/schema/ascii'
import { MuFixedASCII } from 'mudb/schema/fixed-ascii'
import { MuUTF8 } from 'mudb/schema/utf8'

new MuASCII(identity?:string)
new MuFixedASCII(lengthOrIdentity:number|string)
new MuUTF8(identity?:string)

const IpfsHash = new MuFixedASCII(46)
IpfsHash.length // 46
```

* use `MuASCII` for variable-length string messages that consist of only ASCII characters
* use `MuFixedASCII` for fixed-length string messages that consist of only ASCII characters
* use `MuUTF8` otherwise

---

### void
An empty type, think `undefined`.
```ts
import { MuVoid } from 'mudb/schema/void'
new MuVoid()
```

---

### vector
For TypedArrays.

```ts
type NumberSchema =
      MuFloat32
    | MuFloat64
    | MuInt8
    | MuInt16
    | MuInt32
    | MuUint8
    | MuUint16
    | MuUint32

import { MuVector } from 'mudb/schema/vector'
new MuVector(schema:NumberSchema, dimension:number)
```
* `schema` mapped to the corresponding [TypedArray](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray)
* `dimension` number of elements

```ts
const RGB = new Vector(new MuFloat32(), 3)
RGB.dimension   // 3
RGB.alloc()     // Float32Array(3) [ 0, 0, 0 ]
```

---

### date

```ts
class MuDate implements MuSchema<Date>

import { MuDate } from 'mudb/schema/date'
new Date(identity?:Date)
```

---

### json

```ts
class MuJSON implements MuSchema<object>

import { MuJSON } from 'mudb/schema/json'
new MuJSON(identity?:object)
```

---

### array
A list of elements of the same type.

```ts
class MuArray<ValueSchema extends MuSchema<any>> implements MuSchema<ValueSchema['identity'][]>

import { MuArray } from 'mudb/schema/array'
new MuArray(schema:ValueSchema, capacity:number, identity?:ValueSchema['identity'][])
```
* `schema` schema of the elements
* `capacity` maximum number of elements allowed in an array, for security purpose

```ts
// you can define deeply nested lists
const Field = new MuVarint()
const Row = new MuArray(Field, 10)
const Table = new MuArray(Row, Infinity)
const TableList = new MuArray(Table, Infinity)

TableList.muData    // Table
Table.muData        // Row
Row.muData          // Field
```

---

### sorted array
A list of elements maintaining a specific order.

```ts
class MuSortedArray<ValueSchema extends MuSchema<any>> implements MuSchema<ValueSchema['identity'][]>

import { MuSortedArray } from 'mudb/schema/sorted-array'
new MuSortedArray(
    schema:ValueSchema,
    capacity:number,
    compare?:(a:ValueSchema['identity'], b:ValueSchema['identity']) => number,
    identity?:ValueSchema['identity'][],
)
```
* `schema` schema of the elements
* `capacity` maximum number of elements allowed in an array, for security purpose
* `compare` a function that defines the sort order

```ts
const Card = new MuStruct({
    rank: new MuUint8(),
    suit: new MuUint8(),
})

function compare (a:Card, b:Card) {
    if (a.rank !== b.rank) {
        return a.rank - b.rank
    }
    return a.suit - b.suit
}

const Deck = new MuSortedArray(Card, 52, compare)

DeckSchema.muData   // Card
DeckSchema.compare  // the compare function
```

---

### dictionary
A collection of labelled elements of the same type.

```ts
type Dictionary<Schema extends MuSchema<any>> = {
    [key:string]:Schema['identity']
}

class MuDictionary<ValueSchema extends MuSchema<any>> implements MuSchema<Dictionary<ValueSchema>>

import { MuDictionary } from 'mudb/schema/dictionary'
new MuDictionary(
    schema:ValueSchema,
    capacity:number,
    identity?:Dictionary<ValueSchema>,
)
```
* `schema` schema of the elements
* `capacity` maximum number of elements allowed in a dictionary, for security purpose

---

### struct
A collection of typed fields, similar to C struct.  A struct type is defined by passing in the structure of data.

```ts
type Struct<Spec extends { [prop:string]:MuSchema<any> }> = {
    [prop in keyof Spec]:Spec[prop]['identity']
}

class MuStruct<Spec extends { [prop:string]:MuSchema<any> }> implements MuSchema<Struct<Spec>>

import { MuStruct } from 'mudb/schema/struct'
new MuStruct(spec:Spec)
```
* `spec` a table of schemas which defines the typed fields

```ts
const Vec2 = new MuStruct({
    x: new MuFloat64(0),
    y: new MuFloat64(0),
})
const Particle = new MuStruct({
    position: Vec2,
    velocity: Vec2,
})

// {
//     position: { x: 0, y: 0 },
//     velocity: { x: 0, y: 0 },
// }
const p = Particle.alloc()
```

---

### union
A discriminated union of various labelled subtypes.

```ts
type Union<
    SubTypes extends { [type:string]:MuSchema<any> },
    Type extends keyof SubTypes
> = {
    type:Type
    data:SubTypes[Type]['identity']
}

class MuUnion<
    SubTypes extends { [type:string]:MuSchema<any> }
> implements MuSchema<Union<SubTypes, keyof SubTypes>>

import { MuUnion } from 'mudb/schema/union'
new MuUnion(spec:SubTypes, identityType?:keyof SubTypes)
```

```ts
const FloatOrString = new MuUnion({
    float: new MuFloat64(),
    string: new MuString(),
}, 'float')
FloatOrString.alloc()   // { type: 'float', data: 0 }

const StringOrFloat = new MuUnion({
    float: new MuFloat64(),
    string: new MuString(),
}, 'string')
StringOrFloat.alloc()   // { type: 'string', data: '' }
```
