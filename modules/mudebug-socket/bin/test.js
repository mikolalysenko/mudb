const path = require('path')
const { spawnSync, spawn } = require('child_process')
const getPort = require('get-port')

const modulePath = path.resolve(__dirname, '..')

spawnSync(
    'node', [ 'test/local.js' ],
    {
        cwd: modulePath,
        stdio: 'inherit',
    },
)

getPort().then(
    (port) => {
        const server = spawn(
            'node',
            [ 'test/start-server.js', port ],
            { cwd: modulePath },
        )

        server.stdout.once('data', (output) => {
            console.log(output.toString())
            spawn(
                `browserify test/web.js -t [ envify --PORT ${port} ] | tape-run`,
                {
                    cwd: modulePath,
                    shell: true,
                    stdio: 'inherit',
                },
            ).on('exit', process.exit)
        })
    },
    console.error,
)
