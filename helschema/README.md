# helschema
A collection of tools for specifying network protocols in heldb.

# example

```javascript
const HelStruct = require('helschema/struct');
const HelString = require('helschema/string');
const HelFloat = require('helschema/float64');
const HelInt = require('helschema/int32');
const HelDictionary = require('helschema/dictionary');

const Entity = HelStruct({
    x: HelFloat(),
    y: HelFloat(),
    dx: HelFloat(),
    dy: HelFloat(),
    hp: HelInt(10),
    name: HelString('entity')
})

const EntitySet = HelDictionary(Entity)


const entities = EntitySet.alloc()

const player = Entity.create()
player.x = 10
player.y = 10
player.dx = -10
player.dy = -20
player.name = 'player'

entities['foo'] = player
```

# api

## primitives

### numbers

#### `require('helschema/int8')([identity])`
8-bit signed integer

#### `require('helschema/int16')([identity])`
16-bit signed integer

#### `require('helschema/int32')([identity])`
32-bit signed integer

#### `require('helschema/uint8')([identity])`
8-bit unsigned integer

#### `require('helschema/uint16')([identity])`
16-bit unsigned integer

#### `require('helschema/uint32')([identity])`
32-bit unsigned integer

#### `require('helschema/float32')([identity])`
32-bit ieee754 float

#### `require('helschema/float64')([identity])`
64-bit ieee754 float

### strings

#### `require('helschema/string')([identity])`
JS string data type

### enums

#### `require('helschema/boolean')([identity])`

## compound types

#### `require('helschema/struct')(schema[,identity])`

#### `require('helschema/union')(subtypes[,identity])`

## data structures

#### `require('helschema/dictionary')([identity])`

# planned

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