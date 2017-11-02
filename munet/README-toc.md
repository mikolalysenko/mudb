# munet
Networking abstractions for `mudb`.

## example

**server.js**

```javascript
const server = require('munet/ws/server')

```

**socket.js**

```javascript
const socket = require('munet/ws/socket')

```

# tabke of contents

# install #

```
npm i munet
```

# api #
`munet` is a generic socket abstraction.  At a high level there are two basic interfaces:

## socket interface ##
`MuSocket` sockets are bidirectional sockets.  They support both reliable, ordered streams and unreliable optimisitic packet transfer.  

### properties ###

#### `sessionId` ####
A string representing a unique session id identifying the socket.

#### `open` ####
Boolean flag determing whether a socket is open or not.

### methods ###

#### `start(spec)` ####

* `ready()`
* `message(data:Uint8Array, unreliable:boolean)`
* `close()`

#### `send(data:Uint8Array, unreliable?:boolean)` ####

#### `close()` ####

## socket server interface ##

### properties ###

#### `clients[]` ####

#### `open` ####

### method ###

#### `start()` ####

#### `close()` ####

## local network ##

## websockets ##

## webworkers ##

# more examples #

# TODO

* ~~Local (via `setTimeout`)~~
* WebSockets
* WebWorkers (planned)
* WebRTC (planned)
* TCP/UDP (planned)
* File system (planned)
* finish websockets
* jitter simulation
* latency simulation
* logging
* testing
* docs
* session id generation

# credits
Development supported by Shenzhen DianMao Digital Technology Co., Ltd.

<img src="https://raw.githubusercontent.com/mikolalysenko/mudb/master/img/logo.png" />

Written in Shenzhen, China.

(c) 2017 Mikola Lysenko, Shenzhen DianMao Digital Technology Co., Ltd.
