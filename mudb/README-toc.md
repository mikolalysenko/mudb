# mudb
A database for HTML5 multiplayer games.

A `mudb` instance consists of multiple protocols which implement different behaviors between the server and client.

A *protocol* is a collection of message handlers which implement

## example
This is heavily commented example showing how to create a server/client pair and protocol using `mudb`.  Each `mudb` instance consists of a `MuServer` and several `MuClient`s.  Each node in the system consists of one or more protocols which define different behaviors.  To create a protocol a user must specify the following data:

1. A schema
1. A server protocol handler
1. A client protocol handler

Here is an example of a simple chat protocol:

### chat example

**schema.js**

```javascript
// first, we define a
import {
    MuString,
    MuStruct,
    MuFloat32,
    MuUnion,
} from 'muschema';

export const ChatSchema = {
    client: {
        chat: new MuStruct({
            name: new MuString(),
            text: new MuString(),
        }),
    },
    server: {
        say: new MuString(),
    },
};
```

**server.js**

```javascript
import { ChatSchema } from './schema';

export = function (server) {
    const protocol = server.protocol(ChatSchema);

    protocol.configure({
        message: {
            say: (client, text) => {
                protocol.broadcast.chat({
                    name: client.sessionId,
                    text,
                });
            },
        },
    });

    server.start();
};
```

**client.js**

```javascript
import { ChatSchema } from './schema';

export = function (client) {
    const messageDiv = document.createElement('div');
    const messageStyle = messageDiv.style;
    messageStyle.overflow = 'auto';
    messageStyle.width = '400px';
    messageStyle.height = '300px';

    const textDiv = document.createElement('input');
    textDiv.type = 'text';
    const textStyle = textDiv.style;
    textStyle.width = '400px';
    textStyle.padding = '0px';
    textStyle.margin = '0px';

    document.body.appendChild(messageDiv);
    document.body.appendChild(document.createElement('br'));
    document.body.appendChild(textDiv);

    const protocol = client.protocol(ChatSchema);

    protocol.configure({
        ready: () => {
            textDiv.addEventListener('keydown', (ev) => {
                if (ev.keyCode === 13) {
                    const message = textDiv.value;
                    textDiv.value = '';
                    protocol.server.message.say(message);
                }
            });
        },
        message: {
            chat: ({name, text}) => {
                const textNode = document.createTextNode(`${name}: ${text}`);
                messageDiv.appendChild(textNode);
                messageDiv.appendChild(document.createElement('br'));
            },
        },
    });

    client.start();
};
```

### running the game


# table of contents

# install #

```
npm install mudb muschema munet
```

# api #

## protocols ##
The first step to creating any application with `mudb` is to specify a protocol schema using [`muschema`](https://github.com/mikolalysenko/mudb/tree/master/muschema).  Each protocol then specifies two protocol interfaces, one for the client and one for the server.  A protocol interface is an object with the following properties:

* `state` which defines the state protocol
* `message` which is an object containing all message types and their arguments
* `rpc` which is an object containing all rpc types and their arguments

**Example:**

Here is a protocol for a simple game with a chat server

```javascript
const MuVoid = require('muschema/void')
const MuFloat = require('muschema/float64')
const MuStruct = require('muschema/struct')
const MuString = require('muschema/string')
const MuDictionary = require('muschema/dictionary')

const Vec2 = MuStruct({
    x: MuFloat(),
    y: MuFLoat()
})

const Agent = MuStruct({
    position: Vec2,
    velocity: Vec2,
    name: MuString('player')
})

module.exports = {
    client: {
        state: Agent,
        message: {
            chat: MuStruct({
                sender: MuString(),
                message: MuString()
            }
        },
        rpc: {}
    },
    server: {
        state: MuDictionary(Agent),
        message: {
            chat: MuString()
        },
        rpc: {
            setName:[MuString(), MuVoid()]
        }
    }
}
```

## server ##
A server in `mudb` processes messages from many clients.  It may choose to accept or reject incoming connections and dispatch messages to clients as appropriate.

### server constructor ###
`mudb/server` exports the constructor for the server.  It takes an object which accepts the following arguments:

* `protocol` which is a protocol schema as described above (see [`muschema`](../muschema) for more details)
* `socketServer` a `munet` socket server instance (see [`munet`](FIXME) for more details)
* `windowLength` an optional parameter describing the number of states to buffer

**Example:**

```javascript
const server = require('mudb/server')({
    socketServer: ..., // some socket server interface created by munet
    protocol
})
```

### server events ###
Once a server is created, it is necessary to register event handlers and start the server.  This is done using the `server.start()` method.  This method takes an object that has the following properties:

* `ready()` which is called when the server is started
* `message` which is an object containing implementations of handlers for all of the message types
* `raw`
* `connect(client)` called when a client connects to the server
* `disconnect(client)` called when a client disconnects from the server

**Example:**

Working from the chat server schema above, here is a simple server for the above chat log

```javascript
server.start({
    ready() {
        console.log('server started')
    },
    message: {
        chat(client, msg) {
            server.broadcast.chat(server.state[client.sessionId].name, msg)
        }
    },
    rpc: {
        setName(client, name, cb) {
            const ids = Object.keys(server.state)
            for (let i = 0; i < ids.length; ++i) {
                if (server.state[ids[i]].name === name) {
                    return cb('name already in use')
                }
            }
            server.state[client.sessionId].name = name
            return cb()
        }
    },
    connect(client) {
        server.state[client.sessionId] = client.schema.create()
        server.broadcast.chat('server', 'player joined')
        server.commit()
    },
    state(client) {
        const serverState = server.state[client.sessionId]
        const clientState = client.state

        serverState.position.x = clientState.position.x
        serverState.position.y = clientState.position.y
        serverState.velocity.x = clientState.velocity.x
        serverState.velocity.y = clientState.velocity.y

        server.commit()
    },
    disconnect(client) {
        delete server.state[client.sessionId]
        server.commit()
    }
})
```

## client ##

### client constructor ###

```javascript
const client = require('mudb/client')({
    socket,
    protocol
})
```

### client events ###

* `ready()`
* `message`
* `raw()`
* `close()`

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

### method ###

#### `start()` ####

#### `close()` ####

# usage tips #

# helpful modules #

# more examples #

# TODO

* more test cases

# credits
Development supported by Shenzhen DianMao Digital Technology Co., Ltd.

<img src="https://raw.githubusercontent.com/mikolalysenko/mudb/master/img/logo.png" />

Written in Shenzhen, China.

(c) 2017 Mikola Lysenko, Shenzhen DianMao Digital Technology Co., Ltd.

