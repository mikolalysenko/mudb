# heldb

# Goals

# Strawman

#### `model.js`

```javascript
const HelStruct = require('helschema/struct')
const HelNumber = require('helschema/number')
const HelString = require('helschema/string')
const HelDictionary = require('helschema/dictionary')

const EntityModel = HelStruct({
    x: HelNumber,
    y: HelNumber,
    dx: HelNumber,
    dy: HelNumber,
    color: HelString
})

module.exports = {
    game: HelDictionary(EntityModel),
    entity: EntityModel
    tick: (game) => {
        Object.keys(game).forEach((entityId) => {
            const entity = game[entityId]
            entity.x += entity.dx
            entity.y += entity.dy
        })
    }
}
```

#### `client.js`

```javascript
const model = require('./model')

const canvas = document.createElement('canvas')
document.body.appendChild(canvas)

require('helclient')({
    model: model.game,
    onReady(err, client) {
        if (!client) {
            return alert(err)
        }

        client.onTick(model.game.tick)

        function render () {
            

            window.requestAnimationFrame(render)
        }
        render()
    }
})
```

#### `server.js`

```javascript
const path = require('path')
const model = require('./model')

require('helserver')({
    model: model.game,
    net: {
        budo: {
            client: path.join(__dirname, './client.js'),
        }
    },
    tickRate: 32,
    syncRate: 200,
    onReady(err, server) {
        server.rpc('move', ({x, y, dx, dy}, sessionID) => {
            const entity = server.state[sessionId]
            const dt = server.clients[sessionId].clock.tick - server.clock.tick
            entity.x = x + dt * dx
            entity.y = y + dt * dy
            entity.dx = dx
            entity.dy = dy
            server.snapshot()
        })

        server.onConnect((sessionId, connection) => {
            server.state[sessionId] = model.entity.create({
                x: 2 * Math.random() - 1,
                y: 2 * Math.random() - 1,
                dx: 0,
                dy: 0,
                color: `rgb(${Math.random() * 256 | 0}, ${Math.random() * 256 | 0, Math.random() * 256 | 0})`
            })
        })

        server.onTick(model.tick)
    }
})
```

# Modules

## State replication

## Network transport

## Timeline

## Clock synchronization

## RPC

## Client bundle

## Server bundle