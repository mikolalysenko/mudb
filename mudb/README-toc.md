# mudb
A database for realtime server-client applications.

A `mudb` instance consists of multiple protocols which implement different behaviors between the server and client.

A *protocol* is a collection of message handlers which implement

## example
Here is a minimal chat room example showing how to create a server/client pair and protocol using `mudb`.  A `mudb` instance consists of a `MuServer` and several `MuClient`s.  Each node in the system consists of one or more protocols which define different behaviors.  To create a protocol a user must specify the following data:

1. A schema
2. A server protocol handler
3. A client protocol handler

The first step to creating any application with `mudb` is to specify a schema using `muschema`, which always consists of two properties, `server` and `client`, each of which is an object containing the state layouts of the corresponding message handlers.

**schema.js**

```javascript
var muschema = require('muschema')
var MuStruct = muschema.MuStruct
var MuString = muschema.MuString

exports.ChatSchema = {
    client: {
        chat: new MuStruct({
            name: new MuString(),
            text: new MuString(),
        }),
    },
    server: {
        say: new MuString(),
    },
}
```

**server.js**

```javascript
module.exports = function (server) {
    var protocol = server.protocol(require('./schema').ChatSchema)

    var clientNames = {}

    protocol.configure({
        message: {
            say: function (client, text) {
                protocol.broadcast.chat({
                    name: clientNames[client.sessionId],
                    text: text,
                })
            },
        },
        connect: function (client) {
            clientNames[client.sessionId] = client.sessionId
            protocol.broadcast.chat({
                name: 'server',
                text: clientNames[client.sessionId] + ' has joined the channel',
            })
        },
        disconnect: function (client) {
            protocol.broadcast.chat({
                name: 'server',
                text: clientNames[client.sessionId] + ' has left',
            })
        },
    })

    server.start()
}
```

**client.js**

```javascript
module.exports = function (client) {
    var messageDiv = document.createElement('div')
    var textLabel = document.createElement('label')
    var textInput = document.createElement('input')

    var protocol = client.protocol(require('./schema').ChatSchema)

    messageDiv.style.overflow = 'auto'
    messageDiv.style.width = '400px'
    messageDiv.style.height = '300px'

    textLabel.textContent = 'message: '

    textInput.type = 'text'
    textInput.style.width = '400px'
    textInput.style.padding = '0px'
    textInput.style.margin = '0px'

    document.body.appendChild(messageDiv)
    document.body.appendChild(document.createElement('br'))
    document.body.appendChild(textLabel)
    document.body.appendChild(textInput)

    protocol.configure({
        ready: function () {
            textInput.addEventListener('keydown', function (ev) {
                if (ev.keyCode === 13) {
                    protocol.server.message.say(textInput.value)
                    textInput.value = ''
                }
            })
        },
        message: {
            chat: function (data) {
                var name = data.name, text = data.text
                var textNode = document.createTextNode(name + ": " + text)
                messageDiv.appendChild(textNode)
                messageDiv.appendChild(document.createElement('br'))
            }
        }
    })

    client.start()
}
```

To run the example,

1. cd into the directory containing the three files above
2. `npm i mudo`
3. `mudo --socket websocket --open`

# table of contents

# install #
```
npm i mudb muweb-socket mulocal-socket
```

# api #

## server ##

## client ##

## messages ##

### broadcast ###

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

### methods ###

#### `start()` ####

#### `close()` ####

# usage tips #

# helpful modules #

# more examples #

# TODO #

* more test cases

# credits
Development supported by Shenzhen DianMao Digital Technology Co., Ltd.

<img src="https://raw.githubusercontent.com/mikolalysenko/mudb/master/img/logo.png" />

Written in Shenzhen, China.

(c) 2017 Mikola Lysenko, Shenzhen DianMao Digital Technology Co., Ltd.
