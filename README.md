heldb
=====
`heldb` is a client-server data base for multiplayer games on the web.

It makes networked game programming fun and simple.

**TODO INSERT VIDEO LIVE CODING DEMO**

[TypeScript](https://www.typescriptlang.org/) friendly, works great with [nodejs](https://nodejs.org).

**UNDER CONSTRUCTION**

# table of contents

# modules #
`heldb` is implemented as a collection of modules, each of which solves a particular problem related to networked game programming.  They work great together, but you can also use them individually in other projects.

## [heldb](https://github.com/mikolalysenko/heldb/tree/master/heldb)
[`heldb`](https://github.com/mikolalysenko/heldb/tree/master/heldb) is the database itself.  For users learning the API, start here after reading about concepts.

## [helschema](https://github.com/mikolalysenko/heldb/tree/master/helschema)
[`heldb`](https://github.com/mikolalysenko/heldb/tree/master/heldb) is used to define the database schema.

## [helnet](https://github.com/mikolalysenko/heldb/tree/master/helnet)
[helnet](https://github.com/mikolalysenko/heldb/tree/master/helnet) is a socket/server abstraction over websockets, web workers, timeouts and other transports.  You can use it to emulate different network conditions, log and replay events, and set up different testing scenarios.

# big picture concepts #


## rpc ##

Active replication

"Transactions"

RPC and messages

Useful for replicating large data sets

## state replication ##
Replicates state

Uses delta encoding

Necessary for physical properties, dynamic objects

## schemas ##
A schema is a type declaration for the interface between the client and server.

Schemas in `heldb` are specified using the `helschema` module.  Like [protocol buffers](FIXME) or [gRPC](FIXME), `helschema` uses binary serialized messages with a defined schema and makes extensive use of code generation. However, `heldb` departs from these systems in 3 important ways:

* **Javascript only** Unlike protocol buffers, `helschema` has no aspirations of ever being cross-language.  However, it does make it much easier to extend `heldb` to support direct serialization of custom application specific data structures.  For example, you could store all of your objects in an octree and apply a custom schema to directly diff this octree into your own data type.
* **0-copy delta encoding** `helschema` performs all serialization as a relative `diff` operation.  This means that messages and state changes can be encoded as changes relative to some observed reference.  Using relative state changes greatly reduces the amount of bandwidth required to replicate a given change set
* **Memory pools** JavaScript is a garbage collected language, and creating patched versions of different messages can generate many temporary objects.  In order to avoid needless and wasteful GC thrashing, `helschema` provides a pooling interface and custom memory allocator.

## persistence ##
Finally, `heldb` can optionally buffer some number of past state observations.  This can be useful when implementing different types of latency hiding techniques like local perception filters.  It also makes it easier to decouple rendering from state updates.

## further reading ##

Systems that influenced heldb:

* protocol buffers
* quake 3
* planetary annihilation

Lighter blog posts

* gabriel gambetta
* 0fps

Academic references:

* Local perception filters

# examples #

Collect list of systems using `heldb`

# developing

How to set up local development environment.

# TODO

## Planned features:

* thorough documentation
* delta based state replication
* 0-copy binary serialization
* 0-gc pooled memory management
* in-browser server emulation
* multiple network transports
* local network simulation
* tracing and playback
* quick start development server

## Deliberately missing features:

* Lobby server
* Match making
* Login/identity management
* Session management
* Region of interest management
* Fully peer-to-peer networking
* Cross language support (100% JavaScript/TypeScript)
* Cryptographic security is deferred to transport layer

## Examples wanted

* Chat room
* Moving dots
* Capture the flag
* Asteroids
* Pong
* Tetris

# credits
