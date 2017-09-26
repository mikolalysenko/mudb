heldb
=====
`heldb` is a fast, simple data base for creating multiplayer games on the web.

**UNDER CONSTRUCTION**

## Planned features:

* simple API
* thorough documentation
* typescript compatibility
* delta based state replication
* 0-copy binary serialization
* 0-gc pooled memory management
* client-server model
* in-browser server emulation
* type safe RPC
* state logging
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

# install

```
npm i heldb helschema helnet
```

# example

```javascript
// First we specify a network protocol
const HelNumber = require('helschema/number')
const HelString = require('helschema/string')
const HelStruct = require('helschema/struct')
const HelDictionary = require('helschema/dictionary')

const EntitySchema = HelStruct({
    x: HelNumber,
    y: HelNumber,
    color: HelString
})

const protocol = {
    client: {
        state: EntitySchema,
        message: {},
        rpc: {},
    },
    server: {
        state: HelDictionary(EntitySchema),
        message: { 
            splat: EntitySchema
        },
        rpc: {}
    }
}

function clientMain () {
    const canvas = document.createElement('canvas')
    document.body.appendChild(canvas)
    const context = canvas.getContext('2d')

    const client = require('heldb/client')({
        protocol,
        socket: require('helnet/socket')()
    })

    function randColor () {
        return `rgb(${Math.random() * 256},${Math.random() * 256},${Math.random() * 256})`
    }

    client.start({
        ready(err) {
            const player = client.state.head
            player.x = 0.5
            player.y = 0.5
            player.color = randColor()
            client.state.commit()

            canvas.addEventListener('mousemove', ({clientX, clientY}) => {
                player.x = clientX / canvas.width
                player.y = clientY / canvas.height
                client.state.commit()
            })

            canvas.addEventListener('click', ({clientX, clientY}) => {
                client.actions.splat({
                    x: clientX / canvas.width,
                    y: clientY / canvas.height,
                    color: randColor()
                })
            })

            function render () {
                client.peers.forEach((peer) => {
                    const {x, y, color} = peer.state.head
                    context.fillStyle = color
                    context.fillRect(canvas.width * x - 10, canvas.height * y - 10, 20, 20)
                })
                window.requestAnimationFrame(render)
            }
            render()
        }
    })
}

function serverMain () {
    const server = require('heldb/server')({
        protocol,
        socketServer: require('helnet/server')({
            client: __filename,
            live: true,
            debug: true
        })
    })
    
    let splatCount = 0

    server.start({
        event: {
            splat (splat) {
                server.state.head[++splatCount] = EntitySchema.clone(splat)
                server.state.commit()
            }
        }
    })
}

if (process.env.HEL_CLIENT) {
    clientMain()
} else {
    serverMain()
}
```

## running the example

```
node example.js
```

# overview

## helschema

Used to specify network protocol.  Perform serialization, diffing and patching

## helnet

## heldb


# design notes

## replication

### active

"Transactions"

RPC and messages

Useful for replicating large data sets

### passive

Replicates state

Uses delta encoding

Necessary for physical properties, dynamic objects

## schemas

Faster, smaller serialization.

Extensible, avoids ontological problems

Simple

## systems that influenced heldb

### quake 3
Delta based state replication

### planetary annihilation
Timelines

### protobufs
Schema based serialization

# credits
