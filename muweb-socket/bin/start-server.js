const { createServer } = require('http')
const { MuWebSocketServer } = require('../server')

function noop () {}

const server = createServer()

const socketServer = new MuWebSocketServer({ server })
socketServer.start({
    ready: noop,
    connection: noop,
    close: noop,
})

const PORT = 8888
server.listen(PORT)
console.log(`listening on port ${PORT}...\n`)
