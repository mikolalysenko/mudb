# mudb
a collection of modules for building realtime client-server applications consisting of multiple protocols

## concepts

### protocol
A *protocol* in the `mudb` sense, is a collection of related messages and handlers which are grouped by functionalities or whatever.

### message
[Message passing](https://en.wikipedia.org/wiki/Message_passing) is the basic building block for communication in a distributed system.  In `mudb`, *messages* are strongly typed using user-defined *schemas*.  `mudb` provides a [reliable](https://en.wikipedia.org/wiki/Reliability_(computer_networking)), ordered message delivery and a faster but unreliable method for sending messages immediately.

### schema
A *schema* is a type declaration for the interface between client and server.

### socket
`mudb` communicates over the generic socket abstractions.  *Sockets* support both reliable and unreliable delivery.  Reliable delivery is used for messages, while unreliable delivery is used for state replication.  Unreliable delivery is generally faster since it does not suffer from head-of-line blocking problems.

## modules

* [core](src)
* [rda](src/rda)
* [replica](src/replica)
* [rpc](src/rpc)
* [scheduler](src/scheduler)
* [schema](src/schema)
* [socket](src/socket)
    * [local](src/socket/local)
    * [uws](src/socket/uws)
    * [web](src/socket/web)
* [stream](src/stream)

## examples

* [chatroom](example/chatroom)
* [ctf](example/ctf)
* [puzzle](example/puzzle)
* [snake](example/snake)
* [todo](example/todo)
* [trackpad](example/trackpad)

## further reading
Light reading:
* [Protocol Buffers](https://developers.google.com/protocol-buffers)
* [Quake 3 network model](http://fabiensanglard.net/quake3/network.php)
* [Janus](http://equis.cs.queensu.ca/wiki/index.php/Janus)
* "[The Tech of Planetary Annihilation: ChronoCam](https://blog.forrestthewoods.com/the-tech-of-planetary-annihilation-chronocam-292e3d6b169a)"
* "[The Implementation of Rewind in Braid](https://www.youtube.com/watch?v=8dinUbg2h70)"
* "[Relativistic Replication](https://mikolalysenko.github.io/nodeconfeu2014-slides/index.html#/)"
* "[Source Multiplayer Networking](https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking)"

Academic references:
* C. Savery, T.C. Graham, "[Timelines: Simplifying the programming of lag compensation for the next generation of networked games](https://link.springer.com/article/10.1007/s00530-012-0271-3)" 2013
* Local perception filters

## FAQ
[FAQ](https://github.com/mikolalysenko/mudb/issues?q=is%3Aissue+label%3AFAQ+)

## credits
Development supported by Shenzhen DianMao Digital Technology Co., Ltd.

Copyright (c) 2020 Mikola Lysenko, Shenzhen DianMao Digital Technology Co., Ltd.
