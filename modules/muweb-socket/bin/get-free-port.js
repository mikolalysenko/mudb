const { createServer } = require('net')

module.exports = (cb) => {
    const server = createServer()
    server.unref()

    server.on('error', cb)

    // if no port specified, will listen on an arbitrary unused one
    server.listen(() => {
        const port = server.address().port
        server.close(() => {
            cb(null, port)
        })
    })
}
