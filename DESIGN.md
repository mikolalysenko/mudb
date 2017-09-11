# heldb

# Goals

* High performance
* Minimal memory allocation
* Mixed active and passive replication
* 

## Sketch

* Clients send messages to server
* Server sends state replicas to clients
* Clients predict state changes

# References

C. Savery, T.C. Graham, "[Timelines: Simplifying the programming of lag compensation for the next generation of networked games](https://link.springer.com/article/10.1007/s00530-012-0271-3)" 2013

Also important: http://equis.cs.queensu.ca/wiki/index.php/Janus

"[Source multiplayer networking](https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking)"

"[Client-server model](https://en.wikipedia.org/wiki/Client%E2%80%93server_model)"

"[Quake 3 networking model](http://fabiensanglard.net/quake3/network.php)"

http://fabiensanglard.net/quake3/The%20Quake3%20Networking%20Mode.html

"[Relativistic replication](https://mikolalysenko.github.io/nodeconfeu2014-slides/index.html#/)"

"[Planetary Annihilation: Chrono cam](https://blog.forrestthewoods.com/the-tech-of-planetary-annihilation-chronocam-292e3d6b169a)"

"[Implementation of Rewind in Braid](https://www.youtube.com/watch?v=8dinUbg2h70)"

# Strawman

Core data structures:
* Schemas
* Feeds
    + entities
    + actions
* Peers
* Actions

Schema selection
+ pass in dictionary mapping schema id -> model replicator

Timeline behavior
+ persistent states
+ head state (mutable)
+ when to discard old states?

Peers publish feeds of states
Each feed has some model
State replication proceeds using delta encoding
How do peers decide which feeds to subscribe to?
+ Introduce a DSL short hand?
+ Data (give a json white list of feeds)
+ Custom function

Server should decide which feeds to republish

P2P vs Client-Server

* P2P more interesting, get substack on board
* Client-server more practical.  project already ambitious...

In P2P server is just a relay node.

* Thinking of server as relay, all server has to do is decide which feeds to accept/reject
* Which events to republish
* Relay could designate a special node as the server
* Can use in-memory communication to send events

Disadvantage: Clients need to be smarter about filtering data
* Client must identify which streams they want to subscribe to
* Fully P2P clients communicate directly.  Verifying state updates becomes tough
    + What happens if a bad actor replicates different states to different entities?
* Leader election to identify current host
* Byzantine tolerance.... PAXOS
* How to do failure detection?
* Could use signed feeds (prevents evil leader from forging packets)
    + Hyperlog - how fast is it?
* Detect log forking/bad clients and have some way to kill them
* Client failure modes:
    + Log fork
    + Timeout

How to access a feed?
+ client.feeds[id]
+ jquery selectors?  'clientid/feed'
+ client.getFeed(id)

Should the server be just another a peer, or should it get a special status?

What do we do with RPC?
Are events (topics) better?

Replication types:

* state feeds
* action logs (queues)

Declare feeds up front


#### `single-file.js`

```javascript
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
        state: EntitySchema
    },
    server: {
        state: HelDictionary(EntitySchema),
        events: { 
            splat: EntitySchema
        }
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
        model: require('./schema'),
        server: require('helnet/server')({
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



#### `protocol.js`

```javascript
const HelNumber = require('helschema/number')
const HelString = require('helschema/string')
const HelStruct = require('helschema/struct')
const HelDictionary = require('helschema/dictionary')

const EntityModel = HelStruct({
    x: HelNumber,
    y: HelNumber,
    color: HelString
})

module.exports = {
    client: {
        state: EntityModel,
        rpc: {   
        },
        messages: {
            setVoxel: HelStruct({
                x: HelNumber,
                y: HelNumber,
                z: HelNumber,
                b: HelNumber
            })
        },
    }
    server: {
        state: HelDictionary(EntityModel),
        rpc: {
            spawn: [
                EntityModel,
                HelNumber,
            ],
        },
        messages: {
        }
    }
}
```

#### `protocol.js`

```javascript
const canvas = document.createElement('canvas')
document.body.appendChild(canvas)
const context = canvas.getContext('2d')

const client = require('heldb/client')({
    schema: require('./schema'),
    net: require('helnet/client')({
    })
})

client.start({
    messages: {
        setVoxel (x, y, z, b) {
            // ...
        }
    }

    ready(err) {
        const player = client.state.head
        canvas.addEventListener('mousemove', ({clientX, clientY}) => {
            player.x = clientX / canvas.width
            player.y = clientY / canvas.height
            client.state.commit()
        })

        canvas.addEventListener('click', () => {
            client.rpc.spawn
        })

        function render () {
            client.peers.forEach((peer) => {
                const {x, y, color} = peer.state.head

                // draw player at x/y with color
                context.fillRect(x - 10, y - 10, 20, 20)
            })
            window.requestAnimationFrame(render)
        }
        render()
    }
})
```

#### `server.js`

```javascript
const path = require('path')
const Model = require('./model')

const server = require('heldb/server')({
    model: require('./schema'),
    net: require('helnet/server')({
        client: path.join(__dirname, './client.js'),
        live: true,
        debug: true,
    }),
})

server.start({
    rpc: {
        spawn (data, client, cb) {
            server.state.head.entities.push(....)
        }
    }
   
    message: {
        click (data, client) {
        }
    }

    connect(client, cb) {
    }

    tick() {
    }

    ready(err) {
    }
})
```

# Modules

## State replication `helschema`

Data types:

* Number
* Integer
* String
* Boolean
* Struct
* Vector
* Dictionary/Set
* Generic JSON
* Array/sequence
* ... more?

Features:

* Patch based state compression
* Interpolation
* Memory pooling, minimize allocation
* Binary serialization (eventually)

## Network `helnet`

Transports:

* Local
* Web worker post message
* Iframe
* Websocket
* net module tcp/udp

Features:

* Use multiple websockets to mitigate head of line blocking
* Simulate jitter/lag
* Packet logging/playback

## History `helhist`

* Interpolate to any time

## Clock synchronization `heltime`

* Tick counter
* Ping estimation
* Clock synchronization
* Frame timer
* Stats

## Common database

* generic state
* timeline set
    * create object
    * destroy object
* snapshot
* RPC
* peer list
* lag time

## Client `helclient`

## Server `helserver`

# Examples

* Chat room
* Moving dots
* Capture the flag
* Asteroids
* Pong
* Tetris
