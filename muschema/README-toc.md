# muschema
An extensible system for specifying diff/patch based replication [schemas](https://en.wikipedia.org/wiki/Database_schema).  In `mudb` schemas are used to define RPC and message interfaces as well as define state layouts.  Schemas allow for run time reflection on type information, and are necessary to support serialization and memory management.

It is kind of like protobufs for JavaScript, only better in that it supports [delta encoding](https://en.wikipedia.org/wiki/Delta_encoding) and is easier to customize (and worse in the sense that it only works in JavaScript).

[Typescript](https://www.typescriptlang.org/) and [node.js](https://nodejs.org/) friendly!

## example
Here is a somewhat contrived example showing how all of the methods of the schemas work.

```javascript
const {
    MuStruct,
    MuString,
    MuFloat64,
    MuInt32,
    MuDictionary
} = require('muschema')

// Define an entity schema
const EntitySchema = new MuStruct({
    x: new MuFloat64(),
    y: new MuFloat64(),
    dx: new MuFloat64(),
    dy: new MuFloat64(),
    hp: new MuInt32(10),
    name: new MuString('entity')
})

const EntitySet = new MuDictionary(EntitySchema)

// create a new entity set object using the schema
const entities = EntitySet.alloc()

// create a new entity and add it to the schema
const player = EntitySchema.alloc()

player.x = 10
player.y = 10
player.dx = -10
player.dy = -20
player.name = 'player'

entities['foo'] = player

// now make a copy of all entities
const otherEntities = EntitySet.clone(entities)

// modify player entity
otherEntities.foo.hp = 1

// compute a patch
const patch = EntitySet.diff(entities, otherEntities)

// apply a patch to a set of entities
const entityCopy = EntitySet.patch(entities, patch)

// release memory
EntitySet.free(otherEntities)
```

# table of contents

# install #

```
npm i muschema
```

# api #

## interfaces ##
Internally each `muschema` is an object which implements the following interface.

* `identity` The default value of an object in the schema.
* `muType` A string encoding some runtime information about the schema.
* `muData` (optional) Additional runtime information about the schema.  May include subtype schemas, etc.
* `alloc()` Creates a new value from scratch
* `free(value)` Returns a value to the internal memory pool.
* `clone(value)` Makes a copy of a value.
* `diff(base, target)` Computes a patch from `base` to `target`
* `patch(base, patch)` Applies `patch` to `base` returning a new value

`diff` and `patch` obey the following semantics:

```javascript
const delta = diff(base, target)

const result = patch(base, delta)

// now: result === target
```

To serialize an arbitrary object without a base, use the identity element.  For example:

```javascript
const serialized = schema.diff(schema.identity, value)
```

Schemas can be composed recursively by calling submethods.  `muschema` provides several common schemas for primitive types and some functions for combining them together into structs, tuples and other common data structures.  If necessary user defined applications can specify custom serialization and diffing/patching methods for various common types.

### a note for typescript ##
For typescript users, a generic interface for schemas can be found in the `muschema/schema` module.  It exports the interface `MuSchema<ValueType>` which any `muschema` should implement.

## primitives ##
Out of the box `muschema` comes with schemas for all primitive types in JavaScript.  These can be accessed using the following constructors.

### void ###
An empty value type.  Useful for specifying arguments to messages which do not need to be serialized.

```javascript
const MuVoid = require('muschema/void')()
```

### boolean ###
A binary `true`/`false` boolean value

```javascript
const MuBoolean = require('muschema/boolean')([identity])
```

### numbers ###
Because `muschema` supports binary serialization

```javascript
// Signed integers 8, 16 and 32-bit
const MuInt8 = require('muschema/int8')([identity])
const MuInt16 = require('muschema/int16')([identity])
const MuInt32 = require('muschema/int32')([identity])

// Unsigned integers
const MuUint8 = require('muschema/uint8')([identity])
const MuInt16 = require('muschema/uint16')([identity])
const MuInt32 = require('muschema/uint32')([identity])

// Floating point
const MuFloat32 = require('muschema/float32')([identity])
const MuFloat64 = require('muschema/float64')([identity])
```

For generic numbers, use `MuFloat64`.  If you know the size of your number in advance, then use a more specific datatype.

### strings ###
String data type

```javascript
const MuString = require('muschema/string')([identity])
```

## functors ##
Primitive data types in `muschema` can be composed using functors.  These take in multiple sub-schemas and construct new schemas.

### structs ###
A struct is a collection of multiple subtypes.  Structs are constructed by passing in a dictionary of schemas.  Struct schemas may be nested as follows:

**Example:**

```javascript
const MuFloat64 = require('muschema/float64')
const MuStruct = require('muschema/struct')

const Vec2 = MuStruct({
    x: MuFloat64(0),
    y: MuFloat64(0),
})

const Particle = MuStruct({
    position: Vec2,
    velocity: Vec2
})

// example usage:
const p = Particle.alloc()
p.position.x = 10
p.position.y = 10

// Particle.free recursively calls Vec2.free
Particle.free(p)
```

### unions ###
A discriminated union of several subtypes.  Each subtype must be given a label.

**Example:**

```javascript
const MuFloat64 = require('muschema/float64')
const MuString = require('muschema/string')
const MuUnion = require('muschema/union')

const FloatOrString = MuUnion({
    float: MuFloat64(),
    string: MuString(),
});

// create a new value
const x = FloatOrString.alloc();
x.type = 'float';
x.data = 1

// compute a delta
const p = FloatOrString.diff(FloatOrString.identity, x);

// apply a patch
const y = FloatOrString.patch(FloatOrString.idenity, p);
```

## data structures ##

### dictionaries ###
A dictionary is a labelled collection of values.

**Example:**

```javascript
const MuUint32 = require('muschema/uint32')
const MuDictionary = require('muschema/dictionary/')

const NumberDictionary = MuDictionary(MuUint32(0))

// create a dictionary
const dict = NumberDictionary.alloc()

dict['foo'] = 3
```

# more examples #

Check out `mudb` for some examples of using `muschema`.

# TODO

## features

* binary serialization
* automated testing
* diff speed benchmark
* patch speed benchmark
* patch size benchmark
* memory pool stats

## more types

* fixed point numbers
* enums
* tuples
* fixed size vectors
* variable length arrays
* multidimensional arrays

## design

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
