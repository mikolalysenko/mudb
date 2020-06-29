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

   * [2 api](#section_2)
      * [2.1 class: MuNetSocketServer](#section_2.1)
         * [2.1.1 new MuNetSocketServer(spec)](#section_2.1.1)
      * [2.2 class: MuNetSocket](#section_2.2)
         * [2.2.1 new MuNetSocket(spec)](#section_2.2.1)

# <a name="section_2"></a> 2 api

## <a name="section_2.1"></a> 2.1 class: MuNetSocketServer

### <a name="section_2.1.1"></a> 2.1.1 new MuNetSocketServer(spec)
* `spec` `<Object>`
    * `tcpServer` `<net.Server>` the underlying TCP server
    * `udpServer` `<dgram.Socket>` the underlying UDP server

## <a name="section_2.2"></a> 2.2 class: MuNetSocket

### <a name="section_2.2.1"></a> 2.2.1 new MuNetSocket(spec)
* `spec` `<Object>`
    * `sessionId` `<string>` a unique session id used to identify the client
    * `connectOpts` `<Object>` used by [connect()](https://nodejs.org/dist/latest/docs/api/net.html#net_socket_connect_options_connectlistener) to initiate a connection when the client starts
    * `bindOpts` `<Object>` used by [bind()](https://nodejs.org/dist/latest/docs/api/dgram.html#dgram_socket_bind_options_callback) to make the socket listen for datagram messages when the client starts
    * `tcpSocket` `<net.Socket>` optional
    * `udpSocket` `<dgram.Socket>` optional
