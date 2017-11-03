mudb
=====
`mudb` is a collection of modules for building realtime client-server networked applications.

[TypeScript](https://www.typescriptlang.org/) friendly, works great with [nodejs](https://nodejs.org).

**WORK IN PROGRESS**

# table of contents

# big picture concepts #
`mudb` is a collection of modules for writing realtime distributed applications consisting of many *protocols*.

## protocols ##
A protocol, in the `mudb` sense`, is a collection of related messages and handlers which are grouped according

## messages ##
[Message passing](FIXME) is the basic building block for communication in a distributed system.  `mudb` provides a [reliable, ordered message delivery](FIXME) and a faster but unreliable method for sending messages immediately.  Messages are strongly typed using user-defined `schemas`.

## schemas ##
A schema is a type declaration for the interface between the client and server. Schemas in `mudb` are specified using the `muschema` module.  Like [protocol buffers](FIXME) or [gRPC](FIXME), `muschema` uses binary serialized messages with a defined schema and makes extensive use of code generation. However, `mudb` departs from these systems in 3 important ways:

* **Javascript only** Unlike protocol buffers, `muschema` has no aspirations of ever being cross-language.  However, it does make it much easier to extend `mudb` to support direct serialization of custom application specific data structures.  For example, you could store all of your objects in an octree and apply a custom schema to directly diff this octree into your own data type.
* **0-copy delta encoding** `muschema` performs all serialization as a relative `diff` operation.  This means that messages and state changes can be encoded as changes relative to some observed reference.  Using relative state changes greatly reduces the amount of bandwidth required to replicate a given change set
* **Memory pools** JavaScript is a garbage collected language, and creating patched versions of different messages can generate many temporary objects.  In order to avoid needless and wasteful GC thrashing, `muschema` provides a pooling interface and custom memory allocator.

## abstract sockets ##
`mudb` communicates over a generic socket abstraction provided by `munet`.  `munet` sockets support both reliable and unreliable delivery.  Unreliable delivery is used for state replication, while reliable delivery is used for messages.  Unreliable delivery is generally faster than reliable delivery since it does not suffer from head-of-line blocking problems.  For websocket servers, `munet` emulates unreliable delivery using multiple websocket connections.

## further reading ##
Light reading:

* protocol buffers
* [quake 3](http://fabiensanglard.net/quake3/network.php)
* "[Planetary Annihilation](https://blog.forrestthewoods.com/the-tech-of-planetary-annihilation-chronocam-292e3d6b169a)"
* [Janus](http://equis.cs.queensu.ca/wiki/index.php/Janus)
* "[Implementation of Rewind in Braid](https://www.youtube.com/watch?v=8dinUbg2h70)"
* "[Relativistic replication](https://mikolalysenko.github.io/nodeconfeu2014-slides/index.html#/)"
* "[Source multiplayer networking](https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking)"

Academic references:

* C. Savery, T.C. Graham, "[Timelines: Simplifying the programming of lag compensation for the next generation of networked games](https://link.springer.com/article/10.1007/s00530-012-0271-3)" 2013
* Local perception filters
* **TODO**

# examples #

**TODO**

# modules #
`mudb` is implemented as a collection of modules for building realtime networked applications.

## mudb ##
[`mudb`](https://github.com/mikolalysenko/mudb/tree/master/mudb) is the database itself.  For users learning the API, start here after reading about concepts.

## muschema ##
[`mudb`](https://github.com/mikolalysenko/mudb/tree/master/mudb) is used to define the database schema.

## protocols ##

### murpc ###

### mustate ###

**TODO**

## tools ##

### mudo ###
[`mudo`](https://github.com/mikolalysenko/mudb/tree/master/mudo) is a local development server based on `budo` which handles a lot of the boilerplate around creating and starting a server/client pair for you.

## socket emulation ##

### mulocal-socket ###

### muweb-socket ###

## internal ##

### mustreams ###

# credits
Development supported by Shenzhen DianMao Digital Technology Co., Ltd.

<img src="img/logo.png" />

Written in Shenzhen, China.

(c) 2017 Mikola Lysenko, Shenzhen DianMao Digital Technology Co., Ltd.
