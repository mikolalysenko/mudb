const { createServer } = require('http')
const { MuWebSocketServer } = require('../server')
const ip = require('ip')

const server = createServer()
const socketServer = new MuWebSocketServer({ server })

const port = process.argv[2]
server.listen(port)

socketServer.start({
    ready: () => {
        console.log(`listening on http://${ip.address()}:${port}`)
    },
    connection: () => { },
    close: () => { },
})
