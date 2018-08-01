const path = require('path')
const { spawn } = require('child_process')

const getPort = require('get-port')

getPort().then(
    (port) => {
        const server = spawn(
            'node', [ 'start-server.js', port ],
            { cwd: __dirname },
        )

        server.stdout.on('data', (msg) => {
            console.log(msg.toString())

            const moduleRoot = path.resolve(__dirname, '..')
            spawn(
                `browserify test/socket.js -t [ envify --PORT ${port} ] | tape-run`,
                {
                    shell: true,
                    cwd: moduleRoot,
                    stdio: 'inherit',
                },
            )
        })
    },
)
