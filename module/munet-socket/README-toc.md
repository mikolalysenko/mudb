# munet-socket
TCP/UDP communications made available for `mudb`, useful when building apps with frameworks like Electron.

# usage

**server**

```js
var tcp = require('net')
var udp = require('dgram')

var MuNetSocketServer = require('munet-socket/server').MuNetSocketServer
var MuServer = require('mudb/server').MuServer

var tcpServer = tcp.createServer()
var udpServer = udp.createSocket({
    type: 'udp4',
    reuseAddr: true,
})
var socketServer = new MuNetSocketServer({
    tcpServer,
    udpServer,
})
var muServer = new MuServer(socketServer)

tcpServer.listen(9977)
udpServer.bind(9988, '127.0.0.1')
muServer.start()
```

**client**

```js
var tcp = require('net')
var udp = require('dgram')

var MuNetSocket = require('munet-socket/socket').MuNetSocket
var MuClient = require('mudb/client').MuClient

var socket = new MuNetSocket({
    sessionId: Math.random().toString(36).substr(2),

    // for TCP socket
    connectOpts: {
        port: 9977,
        host: '127.0.0.1',
    },

    // for UDP socket
    bindOpts: {
        port: 9989,
        address: '127.0.0.1',
    },
})
var muClient = new MuClient(socket)

muClient.start()
```

# table of contents

# install #

```
npm i munet-socket
```

# api #

## class: MuNetSocketServer ##

### new MuNetSocketServer(spec) ###
* `spec` `<Object>`
    * `tcpServer` `<net.Server>` the underlying TCP server
    * `udpServer` `<dgram.Socket>` the underlying UDP server

## class: MuNetSocket ##

### new MuNetSocket(spec) ###
* `spec` `<Object>`
    * `sessionId` `<string>` a unique session id used to identify the client
    * `connectOpts` `<Object>` used by [connect()](https://nodejs.org/dist/latest/docs/api/net.html#net_socket_connect_options_connectlistener) to initiate a connection when the client starts
    * `bindOpts` `<Object>` used by [bind()](https://nodejs.org/dist/latest/docs/api/dgram.html#dgram_socket_bind_options_callback) to make the socket listen for datagram messages when the client starts
    * `tcpSocket` `<net.Socket>` optional
    * `udpSocket` `<dgram.Socket>` optional

## credits
Copyright (c) 2018 He Diyi, Shenzhen Dianmao Technology Company Limited
