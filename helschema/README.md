# helschema
An extensible system for specifying diff/patch based replication [schemas](https://en.wikipedia.org/wiki/Database_schema).  In `heldb` schemas are used to define RPC and message interfaces as well as define state layouts.  Schemas allow for run time reflection on type information, and are necessary to support serialization and memory management.

It is kind of like protobufs for JavaScript, only better in that it supports [delta encoding](https://en.wikipedia.org/wiki/Delta_encoding) and is easier to customize (and worse in the sense that it only works in JavaScript).

[Typescript](https://www.typescriptlang.org/) and [node.js](https://nodejs.org/) friendly!

## example
Here is a somewhat contrived example showing how all of the methods of the schemas work.

```javascript
const HelStruct = require('helschema/struct');
const HelString = require('helschema/string');
const HelFloat = require('helschema/float64');
const HelInt = require('helschema/int32');
const HelDictionary = require('helschema/dictionary');

// Define an entity schema
const EntitySchema = HelStruct({
    x: HelFloat(),
    y: HelFloat(),
    dx: HelFloat(),
    dy: HelFloat(),
    hp: HelInt(10),
    name: HelString('entity')
})

const EntitySet = HelDictionary(EntitySchema)

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

   * [1 install](#section_1)
   * [2 api](#section_2)
      * [2.1 interfaces](#section_2.1)
      * [2.2 primitives](#section_2.2)
         * [2.2.1 void](#section_2.2.1)
         * [2.2.2 boolean](#section_2.2.2)
         * [2.2.3 numbers](#section_2.2.3)
      * [2.3 functors](#section_2.3)
         * [2.3.1 structs](#section_2.3.1)
         * [2.3.2 unions](#section_2.3.2)
         * [2.3.3 dictionaries](#section_2.3.3)
   * [3 more examples](#section_3)

# <a name="section_1"></a> 1 install

```
npm i helschema
```

# <a name="section_2"></a> 2 api

## <a name="section_2.1"></a> 2.1 interfaces
Internally each `helschema` is an object which implements the following interface.

* `identity` The default value of an object in the schema.
* `helType` A string encoding some runtime information about the schema.
* `helData` (optional) Additional runtime information about the schema.  May include subtype schemas, etc.
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

Schemas can be composed recursively by calling submethods.  `helschema` provides several common schemas for primitive types and some functions for combining them together into structs, tuples and other common data structures.  If necessary user defined applications can specify custom serialization and diffing/patching methods for various common types.

### a note for typescript ##
For typescript users, a generic interface for schemas can be found in the `helschema/schema` module.  It exports the interface `HelSchema<ValueType>` which any `helschema` should implement.

## <a name="section_2.2"></a> 2.2 primitives
Out of the box `helschema` comes with schemas for all primitive types in JavaScript.  These can be accessed using the following constructors.

### <a name="section_2.2.1"></a> 2.2.1 void
An empty value type.  Useful for specifying arguments to messages which do not need to be serialized.

```javascript
const HelVoid = require('helschema/void')()
```

### <a name="section_2.2.2"></a> 2.2.2 boolean
A binary `true`/`false` boolean value

```javascript
const HelBoolean = require('helschema/boolean')([identity])
```

### <a name="section_2.2.3"></a> 2.2.3 numbers
Because `helschema` supports binary serialization

```javascript
// Signed integers 8, 16 and 32-bit
const HelInt8 = require('helschema/int8')([identity])
const HelInt16 = require('helschema/int16')([identity])
const HelInt32 = require('helschema/int32')([identity])

// Unsigned integers
const HelUint8 = require('helschema/uint8')([identity])
const HelInt16 = require('helschema/uint16')([identity])
const HelInt32 = require('helschema/uint32')([identity])

// Floating point
const HelFloat32 = require('helschema/float32')([identity])
const HelFloat64 = require('helschema/float64')([identity])
```

For generic numbers, use `HelFloat64`.  If you know the size of your number in advance, then use a more specific datatype.

### strings
String data type

```javascript
const HelString = require('helschema/string')([identity])
```

## <a name="section_2.3"></a> 2.3 functors
Primitive data types in `helschema` can be composed using functors.  These take in multiple sub-schemas and construct new schemas.

### <a name="section_2.3.1"></a> 2.3.1 structs
A struct is a collection of multiple subtypes.  Structs are constructed by passing in a dictionary of schemas.  Struct schemas may be nested as follows:

**Example:**

```javascript
const HelFloat64 = require('helschema/float64')
const HelStruct = require('helschema/struct')

const Vec2 = HelStruct({
    x: HelFloat64(0),
    y: HelFloat64(0),
})

const Particle = HelStruct({
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

### <a name="section_2.3.2"></a> 2.3.2 unions
A discriminated union of several subtypes.  Each subtype must be given a label.

**Example:**

```javascript
const HelFloat64 = require('helschema/float64')
const HelString = require('helschema/string')
const HelUnion = require('helschema/union')

const FloatOrString = HelUnion({
    float: HelFloat64(),
    string: HelString(),
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

## data structures

### <a name="section_2.3.3"></a> 2.3.3 dictionaries
A dictionary is a labelled collection of values.

**Example:**

```javascript
const HelUint32 = require('helschema/uint32')
const HelDictionary = require('helschema/dictionary/')

const NumberDictionary = HelDictionary(HelUint32(0))

// create a dictionary
const dict = NumberDictionary.alloc()

dict['foo'] = 3
```

# <a name="section_3"></a> 3 more examples

Check out `heldb` for some examples of using `helschema`.

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

