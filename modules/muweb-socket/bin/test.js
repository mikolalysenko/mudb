const path = require('path')
const { spawn, spawnSync } = require('child_process')

const getPort = require('get-port')

const moduleRoot = path.resolve(__dirname, '..')

getPort().then(
    (port) => {
        const server = spawn(
            'node', [ 'start-server.js', port ],
            { cwd: __dirname },
        )

        server.stdout.once('data', (msg) => {
            console.log(msg.toString())

            console.log('testing socket...')
            spawn(
                `browserify test/socket.js -t [ envify --PORT ${port} ] | tape-run`,
                {
                    shell: true,
                    cwd: moduleRoot,
                    stdio: 'inherit',
                },
            ).on('exit', process.exit)
        })
    },
)

console.log('testing server...')
const serverTest = spawnSync(
    'node', [ 'test/server.js' ],
    {
        cwd: moduleRoot,
        stdio: 'inherit',
    }
)

if (serverTest.status) {
    process.exit(serverTest.status)
}
