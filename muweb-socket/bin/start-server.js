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

const port = process.argv[2]
server.listen(port, () => {
    console.log(`server listening on port ${port}...\n`)
})
